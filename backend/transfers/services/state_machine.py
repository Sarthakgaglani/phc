"""
Phase 5's state machine: Recommendation -> Review -> Approve/Reject ->
Dispatch -> Receive -> Inventory update (CLAUDE.md rule #6 — no autonomous
transfers). Every transition here is:

1. Idempotent: if a TransferApproval/Dispatch/Receipt already exists for
   this (transfer_request, idempotency_key) pair, return the request as-is
   rather than re-applying anything — a retried request from a flaky rural
   connection is a no-op, not a double-apply or an error.
2. Optimistically locked: the actual state change is a single atomic
   `UPDATE ... WHERE id=X AND version=Y AND status=<expected>`. Only one of
   two concurrent callers can match that WHERE clause (the other's version
   has already moved), so exactly one succeeds — the loser gets
   TransferConflict rather than silently double-committing stock.
"""
from django.db import transaction
from django.db.models import F

from analytics.services import record_immediate_outcome
from core.models import RiskConfig
from core.realtime import broadcast
from forecasting.services import get_current_stock_risk
from inventory.services import record_transfer_in, record_transfer_out
from transfers.models import (
    TransferApproval,
    TransferDispatch,
    TransferReceipt,
    TransferRequest,
    TransferRequestStatus,
)
from transfers.services.exceptions import TransferConflict


def create_requests_for_recommendation(recommendation) -> list[TransferRequest]:
    """One TransferRequest per donor allocation, created once a Phase 4
    recommendation exists — this is the seam between "recommend" and
    "review" (phase5.md), deliberately left out of transfers.services.matching
    since Phase 4 explicitly excludes the approval workflow."""
    created = []
    for allocation in recommendation.allocations.all():
        request, was_created = TransferRequest.objects.get_or_create(
            allocation=allocation,
            defaults={
                "donor_phc": allocation.donor_phc,
                "recipient_phc": recommendation.recipient_phc,
                "medicine": recommendation.medicine,
                "quantity": allocation.quantity,
            },
        )
        if was_created:
            created.append(request)
            broadcast(
                "transfer_request.created",
                {"id": request.id, "status": request.status},
                phcs=[request.donor_phc, request.recipient_phc],
            )
    return created


def _apply_transition(transfer_request_id, expected_version, from_status, to_status):
    with transaction.atomic():
        updated = TransferRequest.objects.filter(
            id=transfer_request_id, version=expected_version, status=from_status
        ).update(status=to_status, version=F("version") + 1)
        if updated == 0:
            raise TransferConflict(
                f"TransferRequest {transfer_request_id} is not at version {expected_version} "
                f"in status {from_status} — someone else already acted on it, "
                f"or your view is stale."
            )
        return TransferRequest.objects.select_related("donor_phc", "recipient_phc").get(
            id=transfer_request_id
        )


def _broadcast_status(transfer_request):
    broadcast(
        "transfer_request.status_changed",
        {"id": transfer_request.id, "status": transfer_request.status},
        phcs=[transfer_request.donor_phc, transfer_request.recipient_phc],
    )


def approve(transfer_request_id, user, expected_version, idempotency_key) -> TransferRequest:
    existing = TransferApproval.objects.filter(
        transfer_request_id=transfer_request_id, idempotency_key=idempotency_key
    ).first()
    if existing:
        return existing.transfer_request

    transfer_request = _apply_transition(
        transfer_request_id, expected_version,
        TransferRequestStatus.PENDING_REVIEW, TransferRequestStatus.APPROVED,
    )
    TransferApproval.objects.create(
        transfer_request=transfer_request,
        decision=TransferApproval.Decision.APPROVED,
        decided_by=user,
        idempotency_key=idempotency_key,
    )
    _broadcast_status(transfer_request)
    return transfer_request


def reject(
    transfer_request_id, user, expected_version, idempotency_key, reason=""
) -> TransferRequest:
    existing = TransferApproval.objects.filter(
        transfer_request_id=transfer_request_id, idempotency_key=idempotency_key
    ).first()
    if existing:
        return existing.transfer_request

    transfer_request = _apply_transition(
        transfer_request_id, expected_version,
        TransferRequestStatus.PENDING_REVIEW, TransferRequestStatus.REJECTED,
    )
    TransferApproval.objects.create(
        transfer_request=transfer_request,
        decision=TransferApproval.Decision.REJECTED,
        decided_by=user,
        reason=reason,
        idempotency_key=idempotency_key,
    )
    _broadcast_status(transfer_request)
    return transfer_request


def dispatch(
    transfer_request_id, user, expected_version, idempotency_key, notes=""
) -> TransferRequest:
    existing = TransferDispatch.objects.filter(
        transfer_request_id=transfer_request_id, idempotency_key=idempotency_key
    ).first()
    if existing:
        return existing.transfer_request

    transfer_request = _apply_transition(
        transfer_request_id, expected_version,
        TransferRequestStatus.APPROVED, TransferRequestStatus.DISPATCHED,
    )
    TransferDispatch.objects.create(
        transfer_request=transfer_request,
        dispatched_by=user,
        notes=notes,
        idempotency_key=idempotency_key,
    )
    _broadcast_status(transfer_request)
    return transfer_request


def receive(
    transfer_request_id, user, expected_version, idempotency_key, notes=""
) -> TransferRequest:
    """The one place the system writes to the inventory ledger itself
    (CLAUDE.md rule #6) — transfer-out at the donor and transfer-in at the
    recipient, written atomically with the state transition so the ledger
    and the transfer status can never disagree."""
    existing = TransferReceipt.objects.filter(
        transfer_request_id=transfer_request_id, idempotency_key=idempotency_key
    ).first()
    if existing:
        return existing.transfer_request

    with transaction.atomic():
        transfer_request = _apply_transition(
            transfer_request_id, expected_version,
            TransferRequestStatus.DISPATCHED, TransferRequestStatus.RECEIVED,
        )
        TransferReceipt.objects.create(
            transfer_request=transfer_request,
            received_by=user,
            quantity_received=transfer_request.quantity,
            notes=notes,
            idempotency_key=idempotency_key,
        )
        config = RiskConfig.objects.current()
        risk_before = get_current_stock_risk(
            transfer_request.recipient_phc, transfer_request.medicine, config=config
        )
        record_transfer_out(
            transfer_request.donor_phc, transfer_request.medicine, transfer_request.quantity,
            recorded_by=user, notes=f"TransferRequest #{transfer_request.id}",
        )
        record_transfer_in(
            transfer_request.recipient_phc, transfer_request.medicine, transfer_request.quantity,
            recorded_by=user, notes=f"TransferRequest #{transfer_request.id}",
        )
        record_immediate_outcome(transfer_request, risk_before)
    _broadcast_status(transfer_request)
    return transfer_request

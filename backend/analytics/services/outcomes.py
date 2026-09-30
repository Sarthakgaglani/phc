"""
Outcome measurement (phase6.md) — never a new calculation, just before/after
snapshots of forecasting.services.StockRisk around a receipt.
"""
from django.utils import timezone

from alerts.models import Alert, AlertCategory
from analytics.models import TransferOutcome
from core.models import RiskConfig
from forecasting.services import get_current_stock_risk


def record_immediate_outcome(transfer_request, risk_before) -> TransferOutcome:
    """Called by transfers.services.state_machine.receive() right after the
    ledger write, so `risk_after` reflects the just-updated stock. `risk_before`
    is passed in rather than re-derived, since the caller already has it from
    the recommendation snapshot (single source of truth, no re-fetch)."""
    config = RiskConfig.objects.current()
    risk_after = get_current_stock_risk(
        transfer_request.recipient_phc, transfer_request.medicine, config=config
    )
    return TransferOutcome.objects.create(
        transfer_request=transfer_request,
        shortage_before=risk_before.shortage,
        risk_level_before=risk_before.risk_level,
        shortage_after_receipt=risk_after.shortage,
        risk_level_after_receipt=risk_after.risk_level,
        followup_due_at=timezone.now() + timezone.timedelta(days=config.outcome_followup_days),
    )


def evaluate_due_followups() -> int:
    """Periodic check (Celery beat): for every outcome whose follow-up
    window has passed, did a critical/high alert reappear for that PHC and
    medicine? If so the transfer didn't (fully) prevent the stock-out."""
    due = TransferOutcome.objects.filter(
        followup_evaluated_at__isnull=True, followup_due_at__lte=timezone.now()
    ).select_related("transfer_request")

    evaluated = 0
    for outcome in due:
        phc = outcome.transfer_request.recipient_phc
        medicine = outcome.transfer_request.medicine
        reappeared = Alert.objects.filter(
            phc=phc,
            medicine=medicine,
            category__in=[AlertCategory.CRITICAL_STOCK_OUT_RISK, AlertCategory.HIGH_STOCK_OUT_RISK],
            is_active=True,
        ).exists()
        outcome.shortage_averted = not reappeared
        outcome.followup_evaluated_at = timezone.now()
        outcome.save(update_fields=["shortage_averted", "followup_evaluated_at", "updated_at"])
        evaluated += 1
    return evaluated

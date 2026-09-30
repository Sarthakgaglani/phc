"""
The I/O-touching glue between StockRisk (Phase 3), the PHC/medicine
catalog, and the pure `donor_matching.match_donors` — kept separate so that
function stays pure and trivially testable (mirrors
forecasting.services.lookup vs. stock_risk).
"""
from django.db import transaction

from core.models import RiskConfig
from core.realtime import broadcast
from forecasting.services import get_current_stock_risk
from phcs.models import PHC
from transfers.models import (
    TransferRecommendation,
    TransferRecommendationAllocation,
    TransferRequestStatus,
)
from transfers.services.distance import distance_km
from transfers.services.donor_matching import SurplusCandidate, match_donors


def build_recommendation(recipient_phc, medicine, config: RiskConfig | None = None):
    """
    Compute the recipient's current shortage and, if one exists, match it
    against every other active PHC's safe surplus. Returns None when there
    is no shortage to recommend against — callers (the Celery task) should
    only invoke this once Phase 3 has already flagged a shortage, but this
    stays safe to call speculatively too.
    """
    config = config or RiskConfig.objects.current()
    recipient_risk = get_current_stock_risk(recipient_phc, medicine, config=config)
    if recipient_risk.shortage <= 0:
        return None

    candidates = []
    candidate_donors = PHC.objects.filter(is_active=True).exclude(id=recipient_phc.id)
    for donor_phc in candidate_donors:
        donor_risk = get_current_stock_risk(donor_phc, medicine, config=config)
        if donor_risk.safe_surplus <= 0:
            continue

        km = distance_km(recipient_phc, donor_phc)
        if config.max_transfer_distance_km is not None and km is not None:
            if km > config.max_transfer_distance_km:
                continue

        candidates.append(
            SurplusCandidate(
                phc_id=donor_phc.id,
                safe_surplus=donor_risk.safe_surplus,
                current_stock=donor_risk.current_stock,
                predicted_daily_consumption=donor_risk.predicted_daily_consumption,
                required_stock=donor_risk.required_stock,
                days_of_cover=donor_risk.days_of_cover,
                distance_km=km,
            )
        )

    result = match_donors(
        shortage_qty=recipient_risk.shortage,
        candidates=candidates,
        min_days_of_cover=config.min_days_of_cover,
    )

    in_flight_statuses = [
        TransferRequestStatus.APPROVED,
        TransferRequestStatus.DISPATCHED,
        TransferRequestStatus.RECEIVED,
    ]
    with transaction.atomic():
        # Never supersede a recommendation that already has an
        # approved/dispatched/received TransferRequest against it (Phase 5) —
        # only ones still pending review (or fully rejected) are fair game.
        TransferRecommendation.objects.filter(
            recipient_phc=recipient_phc, medicine=medicine, is_superseded=False
        ).exclude(allocations__transfer_request__status__in=in_flight_statuses).update(
            is_superseded=True
        )

        recommendation = TransferRecommendation.objects.create(
            recipient_phc=recipient_phc,
            medicine=medicine,
            recipient_current_stock=recipient_risk.current_stock,
            recipient_predicted_daily_consumption=recipient_risk.predicted_daily_consumption,
            recipient_predicted_demand=recipient_risk.predicted_demand,
            recipient_safety_stock=recipient_risk.safety_stock,
            recipient_required_stock=recipient_risk.required_stock,
            recipient_shortage=recipient_risk.shortage,
            unresolved_shortage=result.unresolved_shortage,
        )

        candidates_by_id = {c.phc_id: c for c in candidates}
        for allocation in result.allocations:
            candidate = candidates_by_id[allocation.donor_phc_id]
            TransferRecommendationAllocation.objects.create(
                recommendation=recommendation,
                donor_phc_id=allocation.donor_phc_id,
                quantity=allocation.quantity,
                donor_current_stock=candidate.current_stock,
                donor_predicted_daily_consumption=candidate.predicted_daily_consumption,
                donor_required_stock=candidate.required_stock,
                donor_safe_surplus_before=candidate.safe_surplus,
                donor_days_of_cover_before=allocation.days_of_cover_before,
                donor_days_of_cover_after=allocation.days_of_cover_after,
                distance_km=candidate.distance_km,
                rank=allocation.rank,
            )

    allocated_donor_ids = [a.donor_phc_id for a in result.allocations]
    donor_phcs = list(PHC.objects.filter(id__in=allocated_donor_ids)) if allocated_donor_ids else []
    broadcast(
        "recommendation.created",
        {"id": recommendation.id, "recipient_phc": recipient_phc.id, "medicine": medicine.id},
        phcs=[recipient_phc, *donor_phcs],
    )
    return recommendation

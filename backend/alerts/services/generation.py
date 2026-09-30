"""
Alert generation logic (phase3.md): critical/high stock-out risk and
below-safety-threshold, all derived from forecasting.services.StockRisk —
never recomputed here. `sync_alerts_for` is idempotent and safe to call
repeatedly (from the recompute task, or ad hoc): it activates categories
that newly apply and resolves ones that no longer do, rather than blindly
inserting a new row every run.
"""
from django.utils import timezone

from alerts.models import Alert, AlertCategory
from core.realtime import broadcast
from forecasting.services import StockRisk


def _applicable_categories(risk: StockRisk) -> set[str]:
    categories = set()
    if risk.risk_level == "critical":
        categories.add(AlertCategory.CRITICAL_STOCK_OUT_RISK)
    elif risk.risk_level == "high":
        categories.add(AlertCategory.HIGH_STOCK_OUT_RISK)
    if risk.shortage > 0:
        categories.add(AlertCategory.BELOW_SAFETY_THRESHOLD)
    return categories


def sync_alerts_for(phc, medicine, risk: StockRisk) -> list[Alert]:
    applicable = _applicable_categories(risk)
    active_alerts = {
        alert.category: alert
        for alert in Alert.objects.filter(phc=phc, medicine=medicine, is_active=True)
    }

    created_or_kept = []
    for category in applicable:
        existing = active_alerts.get(category)
        if existing:
            existing.days_of_cover = risk.days_of_cover
            existing.shortage = risk.shortage
            existing.save(update_fields=["days_of_cover", "shortage", "updated_at"])
            created_or_kept.append(existing)
        else:
            new_alert = Alert.objects.create(
                phc=phc,
                medicine=medicine,
                category=category,
                days_of_cover=risk.days_of_cover,
                shortage=risk.shortage,
            )
            created_or_kept.append(new_alert)
            broadcast(
                "alert.created",
                {"id": new_alert.id, "phc": phc.id, "category": category},
                phcs=[phc],
            )

    for category, alert in active_alerts.items():
        if category not in applicable:
            alert.is_active = False
            alert.resolved_at = timezone.now()
            alert.save(update_fields=["is_active", "resolved_at", "updated_at"])
            broadcast(
                "alert.resolved",
                {"id": alert.id, "phc": phc.id, "category": category},
                phcs=[phc],
            )

    return created_or_kept

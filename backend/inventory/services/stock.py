"""
The single source of truth for "how much of this medicine does this PHC
currently have." Forecasting (Phase 3) and shortage/surplus calculation
(Phase 4) call these functions rather than querying InventoryTransaction
directly — see ARCHITECTURE.md.
"""
from django.db.models import Sum

from inventory.models import InventoryTransaction


def current_stock(phc, medicine) -> int:
    """Current stock for one PHC/medicine pair, derived from the ledger."""
    total = InventoryTransaction.objects.filter(phc=phc, medicine=medicine).aggregate(
        total=Sum("quantity")
    )["total"]
    return total or 0


def current_stock_by_medicine(phc) -> dict[int, int]:
    """
    Current stock for every medicine a PHC has ever transacted, in one
    query — what the PHC dashboard needs, since computing `current_stock()`
    once per medicine would be N queries for an N-medicine dashboard.
    Returns {medicine_id: quantity}.
    """
    rows = (
        InventoryTransaction.objects.filter(phc=phc)
        .values("medicine_id")
        .annotate(total=Sum("quantity"))
    )
    return {row["medicine_id"]: row["total"] or 0 for row in rows}

from rest_framework import viewsets

from inventory.models import InventoryTransaction
from inventory.serializers import InventoryTransactionSerializer


class InventoryTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read access to the ledger, scoped by RBAC. Writing happens through
    `StockMovementCreateView` (movements.py), which enforces the
    sign-per-type convention via inventory.services — this viewset stays
    read-only so nothing can bypass that.
    """

    serializer_class = InventoryTransactionSerializer

    def get_queryset(self):
        qs = InventoryTransaction.objects.for_user(self.request.user).select_related(
            "phc", "medicine", "recorded_by"
        )
        phc_id = self.request.query_params.get("phc")
        medicine_id = self.request.query_params.get("medicine")
        if phc_id:
            qs = qs.filter(phc_id=phc_id)
        if medicine_id:
            qs = qs.filter(medicine_id=medicine_id)
        return qs

from rest_framework import viewsets

from analytics.models import TransferOutcome
from analytics.serializers import TransferOutcomeSerializer


class TransferOutcomeViewSet(viewsets.ReadOnlyModelViewSet):
    """Read access to outcome measurements, RBAC-scoped by the recipient
    PHC/district/state — this is what closes the Observe -> ... -> Measure
    Outcome loop on the State dashboard (phase6.md)."""

    serializer_class = TransferOutcomeSerializer

    def get_queryset(self):
        qs = TransferOutcome.objects.for_user(self.request.user).select_related(
            "transfer_request__recipient_phc", "transfer_request__medicine"
        )
        district_id = self.request.query_params.get("district")
        if district_id:
            qs = qs.filter(transfer_request__recipient_phc__district_id=district_id)
        phc_id = self.request.query_params.get("phc")
        if phc_id:
            qs = qs.filter(transfer_request__recipient_phc_id=phc_id)
        return qs.order_by("-created_at")

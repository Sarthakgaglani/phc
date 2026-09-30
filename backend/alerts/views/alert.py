from rest_framework import viewsets

from alerts.models import Alert
from alerts.serializers import AlertSerializer


class AlertViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read access to alerts, scoped by RBAC. Defaults to active alerts only
    (?is_active=false to see resolved history), optionally narrowed to one
    PHC or one district — the same list backs both the PHC dashboard's
    alert banner and the District dashboard's "needs attention" section.
    """

    serializer_class = AlertSerializer

    def get_queryset(self):
        qs = Alert.objects.for_user(self.request.user).select_related("phc", "medicine")

        is_active_param = self.request.query_params.get("is_active", "true")
        if is_active_param.lower() != "all":
            qs = qs.filter(is_active=is_active_param.lower() != "false")

        phc_id = self.request.query_params.get("phc")
        if phc_id:
            qs = qs.filter(phc_id=phc_id)
        district_id = self.request.query_params.get("district")
        if district_id:
            qs = qs.filter(phc__district_id=district_id)

        return qs.order_by("category", "-created_at")

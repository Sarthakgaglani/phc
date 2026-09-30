from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from locations.models import District
from phcs.models import PHC


class DistrictSummaryView(APIView):
    """
    Shared shape for "one row per PHC in a district" endpoints
    (capacity/patient_activity/workforce all need exactly this: validate
    the district is in the requester's RBAC scope, scope the PHC list the
    same way, hand the PHCs to the subclass's aggregation service, and
    serialize the result). Subclasses set `serializer_class` and implement
    `build_rows(phcs) -> list[dict]`.
    """

    serializer_class = None

    def build_rows(self, phcs):
        raise NotImplementedError

    def get(self, request):
        district_id = request.query_params.get("district")
        if not district_id:
            raise ValidationError({"district": "This query parameter is required."})
        try:
            district = District.objects.for_user(request.user).get(pk=district_id)
        except District.DoesNotExist:
            raise PermissionDenied("You cannot view this district.")

        phcs = list(PHC.objects.for_user(request.user).filter(district=district))
        rows = self.build_rows(phcs)
        return Response(self.serializer_class(rows, many=True).data)

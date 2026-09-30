from rest_framework import viewsets, exceptions
from accounts.models import Role
from phcs.models import PHC
from phcs.serializers import PHCSerializer


class PHCViewSet(viewsets.ModelViewSet):
    """
    PHC management endpoint. RBAC enforcement:
    - Queryset filtered by PHC.objects.for_user()
    - Create/update permitted for STATE admin or superuser
    """

    serializer_class = PHCSerializer

    def get_queryset(self):
        return PHC.objects.for_user(self.request.user).select_related("district__state")

    def perform_create(self, serializer):
        user = self.request.user
        if not user.is_superuser and user.role not in (Role.STATE, Role.NATIONAL):
            raise exceptions.PermissionDenied("Only state or national administrators can register new PHCs.")

        district = serializer.validated_data.get("district")
        if not user.is_superuser and user.role == Role.STATE and user.state and district and district.state_id != user.state_id:
            raise exceptions.PermissionDenied("Cannot assign a PHC to a district outside your assigned state.")

        serializer.save()

    def perform_update(self, serializer):
        user = self.request.user
        if not user.is_superuser and user.role not in (Role.STATE, Role.NATIONAL):
            raise exceptions.PermissionDenied("Only state or national administrators can update PHC details.")
        serializer.save()

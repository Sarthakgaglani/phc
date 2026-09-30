from rest_framework import viewsets, exceptions
from accounts.models import Role
from locations.models import District
from locations.serializers import DistrictSerializer


class DistrictViewSet(viewsets.ModelViewSet):
    serializer_class = DistrictSerializer

    def get_queryset(self):
        return District.objects.for_user(self.request.user).select_related("state")

    def perform_create(self, serializer):
        user = self.request.user
        if not user.is_superuser and user.role not in (Role.STATE, Role.NATIONAL):
            raise exceptions.PermissionDenied("Only state or national administrators can create districts.")

        state = serializer.validated_data.get("state") or getattr(user, "state", None)
        # National admin must explicitly provide a state in the request body
        if not user.is_superuser and user.role == Role.STATE and user.state and state != user.state:
            raise exceptions.PermissionDenied("Cannot create a district in another state.")

        serializer.save(state=state)

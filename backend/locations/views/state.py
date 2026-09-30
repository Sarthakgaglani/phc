from rest_framework import viewsets, exceptions

from accounts.models import Role
from locations.models import State
from locations.serializers import StateSerializer


class StateViewSet(viewsets.ModelViewSet):
    """
    States endpoint.
    - Read: all authenticated users (scoped by RBAC — national sees all).
    - Create/Update: national admin or superuser only.
    """
    serializer_class = StateSerializer

    def get_queryset(self):
        return State.objects.for_user(self.request.user)

    def _assert_national(self):
        user = self.request.user
        if not user.is_superuser and user.role != Role.NATIONAL:
            raise exceptions.PermissionDenied(
                "Only national administrators can manage states."
            )

    def perform_create(self, serializer):
        self._assert_national()
        serializer.save()

    def perform_update(self, serializer):
        self._assert_national()
        serializer.save()

    def perform_destroy(self, instance):
        self._assert_national()
        instance.delete()

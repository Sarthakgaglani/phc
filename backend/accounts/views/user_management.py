from rest_framework import viewsets, permissions, exceptions
from accounts.models import User, Role
from accounts.serializers.user_management import UserManagementSerializer


class UserManagementViewSet(viewsets.ModelViewSet):
    """
    User account onboarding & management endpoint. RBAC:
    - State Admins can view/create/manage PHC staff and District officers in their state.
    - Superusers can manage all users.
    """
    serializer_class = UserManagementSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or user.role == Role.NATIONAL:
            return User.objects.all().select_related("state", "district", "phc")
        if user.role == Role.STATE and user.state_id:
            return User.objects.filter(state_id=user.state_id).select_related("state", "district", "phc")
        return User.objects.filter(id=user.id).select_related("state", "district", "phc")

    def perform_create(self, serializer):
        user = self.request.user
        if not user.is_superuser and user.role not in (Role.STATE, Role.NATIONAL):
            raise exceptions.PermissionDenied("Only state or national administrators can onboard new staff users.")

        target_state = serializer.validated_data.get("state") or getattr(user, "state", None)
        # State admin cannot create users outside their own state
        if not user.is_superuser and user.role == Role.STATE and user.state and target_state != user.state:
            raise exceptions.PermissionDenied("Cannot onboard a user outside your assigned state.")

        serializer.save(state=target_state)

    def perform_update(self, serializer):
        user = self.request.user
        if not user.is_superuser and user.role not in (Role.STATE, Role.NATIONAL):
            raise exceptions.PermissionDenied("Only state or national administrators can update staff user accounts.")
        serializer.save()

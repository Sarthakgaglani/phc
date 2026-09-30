from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from accounts.models import Role
from transfers.models import TransferRequest
from transfers.serializers import TransferActionSerializer, TransferRequestSerializer
from transfers.services import state_machine
from transfers.services.exceptions import TransferConflict


class TransferRequestViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read + state-transition endpoints for the approval workflow (phase5.md).
    Read access follows the same donor/recipient RBAC shape as
    TransferRecommendation; each transition action additionally checks the
    role appropriate to that step (district/state officers decide, PHC staff
    at the relevant end dispatch/receive).
    """

    serializer_class = TransferRequestSerializer

    def get_queryset(self):
        qs = TransferRequest.objects.for_user(self.request.user).select_related(
            "donor_phc", "recipient_phc", "medicine", "dispatch", "receipt"
        )
        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)
        phc_id = self.request.query_params.get("phc")
        if phc_id:
            qs = qs.filter(Q(donor_phc_id=phc_id) | Q(recipient_phc_id=phc_id))
        district_id = self.request.query_params.get("district")
        if district_id:
            qs = qs.filter(
                Q(donor_phc__district_id=district_id) | Q(recipient_phc__district_id=district_id)
            )
        return qs

    def _run_transition(self, request, pk, transition_fn, requires_officer=False, phc_field=None):
        transfer_request = self.get_object()

        if requires_officer and request.user.role not in (Role.DISTRICT, Role.STATE):
            raise PermissionDenied("Only district/state officers may approve or reject transfers.")
        if phc_field is not None:
            allowed_phc_id = getattr(transfer_request, f"{phc_field}_id")
            is_officer = request.user.role in (Role.DISTRICT, Role.STATE)
            is_scoped_phc_staff = (
                request.user.role == Role.PHC and request.user.phc_id == allowed_phc_id
            )
            if not (is_officer or is_scoped_phc_staff):
                raise PermissionDenied(f"Only {phc_field.replace('_', ' ')} staff may do this.")

        input_serializer = TransferActionSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        data = input_serializer.validated_data

        try:
            kwargs = {
                "transfer_request_id": transfer_request.id,
                "user": request.user,
                "expected_version": data["version"],
                "idempotency_key": data["idempotency_key"],
            }
            if "reason" in data:
                kwargs["reason"] = data["reason"]
            if "notes" in data:
                kwargs["notes"] = data["notes"]
            updated = transition_fn(**kwargs)
        except TransferConflict as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_409_CONFLICT)

        return Response(TransferRequestSerializer(updated).data)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        return self._run_transition(request, pk, state_machine.approve, requires_officer=True)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        return self._run_transition(request, pk, state_machine.reject, requires_officer=True)

    @action(detail=True, methods=["post"], url_path="dispatch")
    def dispatch_transfer(self, request, pk=None):
        # Named dispatch_transfer, not dispatch — `dispatch` is Django View's
        # own request-routing method and overriding it would break routing
        # entirely. url_path keeps the actual endpoint at .../dispatch/.
        return self._run_transition(request, pk, state_machine.dispatch, phc_field="donor_phc")

    @action(detail=True, methods=["post"])
    def receive(self, request, pk=None):
        return self._run_transition(request, pk, state_machine.receive, phc_field="recipient_phc")

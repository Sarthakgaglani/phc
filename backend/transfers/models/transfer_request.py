from django.db import models

from core.models import TimeStampedModel
from core.rbac import RoleScopedQuerySet


class TransferRequestStatus(models.TextChoices):
    PENDING_REVIEW = "PENDING_REVIEW", "Pending review"
    APPROVED = "APPROVED", "Approved"
    REJECTED = "REJECTED", "Rejected"
    DISPATCHED = "DISPATCHED", "Dispatched"
    RECEIVED = "RECEIVED", "Received"


class TransferRequestQuerySet(RoleScopedQuerySet):
    """
    Same dual-sided (donor + recipient) RBAC shape as
    transfers.models.recommendation.RecommendationQuerySet, but over direct
    donor_phc/recipient_phc FKs rather than joining through allocations.
    """

    state_id_lookup = "recipient_phc__district__state_id"
    district_id_lookup = "recipient_phc__district_id"
    phc_id_lookup = "recipient_phc_id"

    def for_user(self, user):
        if user is None or not getattr(user, "is_authenticated", False):
            return self.none()
        if user.is_superuser:
            return self

        from accounts.models import Role

        if user.role == Role.STATE:
            return self.filter(
                models.Q(recipient_phc__district__state_id=user.state_id)
                | models.Q(donor_phc__district__state_id=user.state_id)
            ).distinct()
        if user.role == Role.DISTRICT:
            return self.filter(
                models.Q(recipient_phc__district_id=user.district_id)
                | models.Q(donor_phc__district_id=user.district_id)
            ).distinct()
        if user.role == Role.PHC:
            return self.filter(
                models.Q(recipient_phc_id=user.phc_id) | models.Q(donor_phc_id=user.phc_id)
            ).distinct()
        return self.none()


class TransferRequest(TimeStampedModel):
    """
    One donor allocation turned into a tracked, human-approved transfer
    (phase5.md's state machine). `version` is the optimistic-locking token:
    every transition is an atomic `UPDATE ... WHERE id=X AND version=Y`
    (see transfers.services.state_machine) so two concurrent approvals on
    the same request can't both succeed — the loser's WHERE clause matches
    zero rows and gets a conflict instead of silently double-applying.

    Donor/recipient PHC and quantity are copied from the allocation at
    creation time (not FK-followed at read time) so a request's terms never
    drift even if the recommendation is later superseded.
    """

    allocation = models.OneToOneField(
        "transfers.TransferRecommendationAllocation",
        on_delete=models.PROTECT,
        related_name="transfer_request",
    )
    donor_phc = models.ForeignKey(
        "phcs.PHC", on_delete=models.PROTECT, related_name="outgoing_transfer_requests"
    )
    recipient_phc = models.ForeignKey(
        "phcs.PHC", on_delete=models.PROTECT, related_name="incoming_transfer_requests"
    )
    medicine = models.ForeignKey(
        "medicines.Medicine", on_delete=models.PROTECT, related_name="transfer_requests"
    )
    quantity = models.DecimalField(max_digits=10, decimal_places=2)

    status = models.CharField(
        max_length=20,
        choices=TransferRequestStatus.choices,
        default=TransferRequestStatus.PENDING_REVIEW,
    )
    version = models.PositiveIntegerField(default=0)

    objects = TransferRequestQuerySet.as_manager()

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["donor_phc", "status"]),
            models.Index(fields=["recipient_phc", "status"]),
        ]

    def __str__(self):
        return (
            f"{self.donor_phc} -> {self.recipient_phc}: "
            f"{self.quantity} {self.medicine} ({self.status})"
        )


class TransferApproval(TimeStampedModel):
    class Decision(models.TextChoices):
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"

    transfer_request = models.ForeignKey(
        TransferRequest, on_delete=models.CASCADE, related_name="approvals"
    )
    decision = models.CharField(max_length=10, choices=Decision.choices)
    decided_by = models.ForeignKey("accounts.User", on_delete=models.PROTECT)
    reason = models.CharField(max_length=255, blank=True)
    idempotency_key = models.CharField(max_length=64)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["transfer_request", "idempotency_key"],
                name="unique_approval_idempotency_key_per_request",
            )
        ]

    def __str__(self):
        return f"{self.transfer_request} -> {self.decision}"


class TransferDispatch(TimeStampedModel):
    transfer_request = models.OneToOneField(
        TransferRequest, on_delete=models.CASCADE, related_name="dispatch"
    )
    dispatched_by = models.ForeignKey("accounts.User", on_delete=models.PROTECT)
    notes = models.CharField(max_length=255, blank=True)
    idempotency_key = models.CharField(max_length=64)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["transfer_request", "idempotency_key"],
                name="unique_dispatch_idempotency_key_per_request",
            )
        ]

    def __str__(self):
        return f"Dispatched: {self.transfer_request}"


class TransferReceipt(TimeStampedModel):
    transfer_request = models.OneToOneField(
        TransferRequest, on_delete=models.CASCADE, related_name="receipt"
    )
    received_by = models.ForeignKey("accounts.User", on_delete=models.PROTECT)
    quantity_received = models.DecimalField(max_digits=10, decimal_places=2)
    notes = models.CharField(max_length=255, blank=True)
    idempotency_key = models.CharField(max_length=64)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["transfer_request", "idempotency_key"],
                name="unique_receipt_idempotency_key_per_request",
            )
        ]

    def __str__(self):
        return f"Received: {self.transfer_request}"

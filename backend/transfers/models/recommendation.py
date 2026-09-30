from django.db import models

from core.models import TimeStampedModel
from core.rbac import RoleScopedQuerySet


class RecommendationQuerySet(RoleScopedQuerySet):
    """
    A recommendation matters to more than one PHC (the recipient AND every
    donor it names), so this can't reuse the generic single-`phc`-path
    `role_scoped_manager` helper — it unions both sides before applying the
    normal state/district/phc scoping.
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
                | models.Q(allocations__donor_phc__district__state_id=user.state_id)
            ).distinct()
        if user.role == Role.DISTRICT:
            return self.filter(
                models.Q(recipient_phc__district_id=user.district_id)
                | models.Q(allocations__donor_phc__district_id=user.district_id)
            ).distinct()
        if user.role == Role.PHC:
            return self.filter(
                models.Q(recipient_phc_id=user.phc_id)
                | models.Q(allocations__donor_phc_id=user.phc_id)
            ).distinct()
        return self.none()


class TransferRecommendation(TimeStampedModel):
    """
    One shortage's donor-matching run, logged rather than overwritten (same
    pattern as forecasting.DemandForecast) so past recommendations stay
    auditable. `is_superseded` marks a recommendation that a later recompute
    replaced — Phase 5 will additionally refuse to supersede one that
    already has an approved/dispatched TransferRequest against it.

    The recipient-side shortfall math is snapshotted here (not
    recalculated later) so the explainability payload never drifts from
    what was actually true when the recommendation was made.
    """

    recipient_phc = models.ForeignKey(
        "phcs.PHC", on_delete=models.PROTECT, related_name="shortage_recommendations"
    )
    medicine = models.ForeignKey(
        "medicines.Medicine", on_delete=models.PROTECT, related_name="recommendations"
    )

    recipient_current_stock = models.DecimalField(max_digits=10, decimal_places=2)
    recipient_predicted_daily_consumption = models.DecimalField(max_digits=10, decimal_places=2)
    recipient_predicted_demand = models.DecimalField(max_digits=10, decimal_places=2)
    recipient_safety_stock = models.DecimalField(max_digits=10, decimal_places=2)
    recipient_required_stock = models.DecimalField(max_digits=10, decimal_places=2)
    recipient_shortage = models.DecimalField(max_digits=10, decimal_places=2)

    unresolved_shortage = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="shortage left after allocating every eligible donor's safe surplus.",
    )

    is_superseded = models.BooleanField(default=False)

    objects = RecommendationQuerySet.as_manager()

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["recipient_phc", "medicine", "is_superseded"])]

    def __str__(self):
        return f"{self.recipient_phc} needs {self.recipient_shortage} {self.medicine}"


class TransferRecommendationAllocation(TimeStampedModel):
    """
    One donor's slice of a TransferRecommendation (CLAUDE.md rule #3: a
    shortage may be split across multiple donors). Every field a donor was
    ranked/limited by is snapshotted here so the explainability panel can
    show its reasoning without re-deriving it later, and so Phase 5 can turn
    each row 1:1 into a TransferRequest.
    """

    recommendation = models.ForeignKey(
        TransferRecommendation, on_delete=models.CASCADE, related_name="allocations"
    )
    donor_phc = models.ForeignKey(
        "phcs.PHC", on_delete=models.PROTECT, related_name="donor_allocations"
    )

    quantity = models.DecimalField(max_digits=10, decimal_places=2)

    donor_current_stock = models.DecimalField(max_digits=10, decimal_places=2)
    donor_predicted_daily_consumption = models.DecimalField(max_digits=10, decimal_places=2)
    donor_required_stock = models.DecimalField(max_digits=10, decimal_places=2)
    donor_safe_surplus_before = models.DecimalField(max_digits=10, decimal_places=2)
    donor_days_of_cover_before = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    donor_days_of_cover_after = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    distance_km = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    rank = models.PositiveIntegerField(help_text="1 = donor selected first for this shortage.")

    class Meta:
        ordering = ["recommendation", "rank"]
        indexes = [models.Index(fields=["donor_phc"])]

    def __str__(self):
        return f"{self.donor_phc} -> {self.recommendation.recipient_phc}: {self.quantity}"

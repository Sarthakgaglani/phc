from django.db import models

from core.models import TimeStampedModel
from core.rbac import role_scoped_manager


class TransferOutcome(TimeStampedModel):
    """
    Closes the loop CLAUDE.md/phase6.md describe: Observe -> Forecast ->
    Detect Risk -> Recommend -> Approve -> Transfer -> Update Inventory ->
    **Measure Outcome**. Two measurements, both derived from already-computed
    numbers (StockRisk), never a new calculation of its own:

    - Immediate: shortage/risk right after receipt vs. right before it —
      recorded synchronously by transfers.services.state_machine.receive().
    - Follow-up: whether a critical/high alert re-appeared for the same
      PHC/medicine some days later (RiskConfig.outcome_followup_days) —
      recorded by analytics.tasks.evaluate_due_followups. `None` until then.
    """

    transfer_request = models.OneToOneField(
        "transfers.TransferRequest", on_delete=models.CASCADE, related_name="outcome"
    )

    shortage_before = models.DecimalField(max_digits=10, decimal_places=2)
    risk_level_before = models.CharField(max_length=10)
    shortage_after_receipt = models.DecimalField(max_digits=10, decimal_places=2)
    risk_level_after_receipt = models.CharField(max_length=10)

    followup_due_at = models.DateTimeField()
    followup_evaluated_at = models.DateTimeField(null=True, blank=True)
    shortage_averted = models.BooleanField(
        null=True, blank=True, help_text="Null until the follow-up check runs."
    )

    objects = role_scoped_manager(
        state_id_lookup="transfer_request__recipient_phc__district__state_id",
        district_id_lookup="transfer_request__recipient_phc__district_id",
        phc_id_lookup="transfer_request__recipient_phc_id",
    )

    class Meta:
        indexes = [models.Index(fields=["followup_evaluated_at", "followup_due_at"])]

    def __str__(self):
        return f"Outcome for {self.transfer_request}"

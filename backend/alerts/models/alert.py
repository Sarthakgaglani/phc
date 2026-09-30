from django.db import models

from core.models import TimeStampedModel
from core.rbac import role_scoped_manager


class AlertCategory(models.TextChoices):
    CRITICAL_STOCK_OUT_RISK = "CRITICAL_STOCK_OUT_RISK", "Critical stock-out risk"
    HIGH_STOCK_OUT_RISK = "HIGH_STOCK_OUT_RISK", "High stock-out risk"
    BELOW_SAFETY_THRESHOLD = "BELOW_SAFETY_THRESHOLD", "Below safety stock threshold"


class Alert(TimeStampedModel):
    """
    A live condition, not a one-off event: `is_active` reflects whether the
    condition still holds as of the most recent recompute (see
    alerts.services.sync_alerts_for), and `resolved_at` gives an audit
    trail of when it stopped. Category maps 1:1 onto the platform's risk
    color tokens on the frontend.
    """

    phc = models.ForeignKey("phcs.PHC", on_delete=models.PROTECT, related_name="alerts")
    medicine = models.ForeignKey(
        "medicines.Medicine", on_delete=models.PROTECT, related_name="alerts"
    )
    category = models.CharField(max_length=30, choices=AlertCategory.choices)
    days_of_cover = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    shortage = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    objects = role_scoped_manager()

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["phc", "medicine", "category", "is_active"])]
        constraints = [
            models.UniqueConstraint(
                fields=["phc", "medicine", "category"],
                condition=models.Q(is_active=True),
                name="one_active_alert_per_phc_medicine_category",
            )
        ]

    def __str__(self):
        return f"{self.phc} / {self.medicine} / {self.category}"

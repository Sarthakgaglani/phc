from django.db import models

from core.models import TimeStampedModel
from core.rbac import role_scoped_manager


class DemandForecast(TimeStampedModel):
    """
    One forecasting run's output, logged (not overwritten) so forecast
    accuracy can be evaluated later and so Phase 4's explainability payload
    can cite exactly what a recommendation was based on. `current` risk
    calculations use the most recent row per (phc, medicine); older rows
    stay as history.
    """

    phc = models.ForeignKey("phcs.PHC", on_delete=models.PROTECT, related_name="demand_forecasts")
    medicine = models.ForeignKey(
        "medicines.Medicine", on_delete=models.PROTECT, related_name="demand_forecasts"
    )
    horizon_days = models.PositiveIntegerField()
    predicted_daily_consumption = models.DecimalField(max_digits=10, decimal_places=2)
    predicted_demand = models.DecimalField(
        max_digits=10, decimal_places=2, help_text="predicted_daily_consumption * horizon_days"
    )
    method = models.CharField(
        max_length=50, help_text="Which forecasting.services.forecast_engine implementation ran."
    )
    input_window_days = models.PositiveIntegerField(
        help_text="How many days of historical consumption fed this forecast."
    )

    objects = role_scoped_manager()

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["phc", "medicine", "created_at"])]

    def __str__(self):
        return f"{self.phc} / {self.medicine} / {self.predicted_daily_consumption}/day"

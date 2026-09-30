from django.core.exceptions import ValidationError
from django.db import models

from core.models.base import TimeStampedModel


class RiskConfigManager(models.Manager):
    def current(self):
        """Return the single active config row, creating platform defaults
        on first access so the mechanism always has something to read from
        instead of falling back to a hard-coded constant in Python.
        """
        obj = self.order_by("-updated_at").first()
        if obj is None:
            obj = self.create()
        return obj


class RiskConfig(TimeStampedModel):
    """
    Platform-wide, admin-editable parameters that CLAUDE.md forbids
    hard-coding: safety stock, minimum Days of Cover, risk thresholds,
    forecasting horizon, and redistribution limits.

    Deliberately a single editable row rather than a per-medicine table for
    now (no medicine-specific override requirement yet) — medicine-specific
    rules can be layered on top later without changing callers, since every
    consumer goes through RiskConfig.objects.current().
    """

    label = models.CharField(
        max_length=100,
        default="default",
        help_text="Lets multiple named configs exist later without a schema change.",
    )

    # Forecasting
    forecast_horizon_days = models.PositiveIntegerField(default=14)

    # Safety stock: expressed as days of predicted demand held as buffer.
    default_safety_stock_days = models.PositiveIntegerField(default=7)

    # Days of Cover thresholds — below these cutoffs a PHC is that risk level.
    min_days_of_cover = models.DecimalField(
        max_digits=5,
        decimal_places=1,
        default=5.0,
        help_text="A transfer may never drop a donor below this many Days of Cover.",
    )
    critical_risk_days_of_cover = models.DecimalField(max_digits=5, decimal_places=1, default=3.0)
    high_risk_days_of_cover = models.DecimalField(max_digits=5, decimal_places=1, default=7.0)
    medium_risk_days_of_cover = models.DecimalField(max_digits=5, decimal_places=1, default=14.0)

    # Redistribution limits
    max_transfer_distance_km = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Null means no distance cap.",
    )

    # Bed-occupancy pressure thresholds (Phase 2 district dashboard), as a
    # percentage of total beds occupied.
    bed_pressure_medium_occupancy_pct = models.PositiveIntegerField(default=50)
    bed_pressure_high_occupancy_pct = models.PositiveIntegerField(default=75)
    bed_pressure_critical_occupancy_pct = models.PositiveIntegerField(default=90)

    # Outcome measurement (Phase 6): how long after a receipt to check
    # whether a critical/high alert re-appeared for the same PHC/medicine.
    outcome_followup_days = models.PositiveIntegerField(default=7)

    objects = RiskConfigManager()

    class Meta:
        verbose_name = "Risk & safety stock config"
        verbose_name_plural = "Risk & safety stock config"

    def __str__(self):
        return f"RiskConfig({self.label})"

    def clean(self):
        if not (
            self.critical_risk_days_of_cover
            < self.high_risk_days_of_cover
            < self.medium_risk_days_of_cover
        ):
            raise ValidationError(
                "Risk thresholds must be strictly increasing: "
                "critical < high < medium days of cover."
            )
        if not (
            self.bed_pressure_medium_occupancy_pct
            < self.bed_pressure_high_occupancy_pct
            < self.bed_pressure_critical_occupancy_pct
        ):
            raise ValidationError(
                "Bed-pressure thresholds must be strictly increasing: "
                "medium < high < critical occupancy %."
            )

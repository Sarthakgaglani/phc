from django.contrib import admin

from core.models import RiskConfig


@admin.register(RiskConfig)
class RiskConfigAdmin(admin.ModelAdmin):
    list_display = (
        "label",
        "default_safety_stock_days",
        "min_days_of_cover",
        "critical_risk_days_of_cover",
        "high_risk_days_of_cover",
        "medium_risk_days_of_cover",
        "forecast_horizon_days",
        "bed_pressure_high_occupancy_pct",
        "bed_pressure_critical_occupancy_pct",
        "updated_at",
    )

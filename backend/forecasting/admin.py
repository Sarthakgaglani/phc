from django.contrib import admin

from forecasting.models import DemandForecast


@admin.register(DemandForecast)
class DemandForecastAdmin(admin.ModelAdmin):
    list_display = (
        "phc",
        "medicine",
        "predicted_daily_consumption",
        "predicted_demand",
        "horizon_days",
        "method",
        "created_at",
    )
    list_filter = ("method", "phc__district__state", "phc__district")

    def has_change_permission(self, request, obj=None):
        return False

from django.contrib import admin

from alerts.models import Alert


@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = ("phc", "medicine", "category", "days_of_cover", "shortage", "is_active")
    list_filter = ("category", "is_active", "phc__district__state", "phc__district")

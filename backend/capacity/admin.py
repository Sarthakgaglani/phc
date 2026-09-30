from django.contrib import admin

from capacity.models import BedCapacity


@admin.register(BedCapacity)
class BedCapacityAdmin(admin.ModelAdmin):
    list_display = ("phc", "date", "occupied_beds", "total_beds")
    list_filter = ("phc__district__state", "phc__district")
    date_hierarchy = "date"

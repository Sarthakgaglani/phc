from django.contrib import admin

from medicines.models import Medicine


@admin.register(Medicine)
class MedicineAdmin(admin.ModelAdmin):
    list_display = ("name", "generic_name", "unit", "code", "is_active")
    search_fields = ("name", "generic_name", "code")
    list_filter = ("is_active",)

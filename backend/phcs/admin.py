from django.contrib import admin

from phcs.models import PHC


@admin.register(PHC)
class PHCAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "district", "is_active")
    list_filter = ("district__state", "district", "is_active")
    search_fields = ("name", "code")

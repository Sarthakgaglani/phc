from django.contrib import admin

from locations.models import District, State


@admin.register(State)
class StateAdmin(admin.ModelAdmin):
    list_display = ("name", "code")
    search_fields = ("name", "code")


@admin.register(District)
class DistrictAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "state")
    list_filter = ("state",)
    search_fields = ("name", "code")

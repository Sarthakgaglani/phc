from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from accounts.models import User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    fieldsets = DjangoUserAdmin.fieldsets + (
        ("Role & scope", {"fields": ("role", "state", "district", "phc")}),
    )
    list_display = ("username", "email", "role", "state", "district", "phc", "is_staff")
    list_filter = ("role", "state", "district", "is_staff")

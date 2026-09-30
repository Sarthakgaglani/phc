from django.contrib import admin

from workforce.models import StaffAttendance, StaffMember


@admin.register(StaffMember)
class StaffMemberAdmin(admin.ModelAdmin):
    list_display = ("name", "role_title", "phc", "is_active")
    list_filter = ("phc__district__state", "phc__district", "is_active")


@admin.register(StaffAttendance)
class StaffAttendanceAdmin(admin.ModelAdmin):
    list_display = ("staff_member", "date", "present")
    list_filter = ("present",)
    date_hierarchy = "date"

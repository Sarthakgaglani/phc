from django.contrib import admin

from patient_activity.models import PatientFootfall


@admin.register(PatientFootfall)
class PatientFootfallAdmin(admin.ModelAdmin):
    list_display = ("phc", "date", "visit_count")
    list_filter = ("phc__district__state", "phc__district")
    date_hierarchy = "date"

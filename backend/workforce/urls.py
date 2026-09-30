from django.urls import path

from workforce.views import StaffSummaryView

urlpatterns = [
    path("summary/", StaffSummaryView.as_view(), name="staff-summary"),
]

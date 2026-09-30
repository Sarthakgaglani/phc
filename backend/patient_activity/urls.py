from django.urls import path

from patient_activity.views import FootfallSummaryView

urlpatterns = [
    path("summary/", FootfallSummaryView.as_view(), name="footfall-summary"),
]

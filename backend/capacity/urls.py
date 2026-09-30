from django.urls import path

from capacity.views import BedCapacitySummaryView

urlpatterns = [
    path("summary/", BedCapacitySummaryView.as_view(), name="bed-capacity-summary"),
]

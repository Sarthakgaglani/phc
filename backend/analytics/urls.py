from django.urls import path
from rest_framework.routers import DefaultRouter

from analytics.views import AskView, DistrictSituationSummaryView, TransferOutcomeViewSet

router = DefaultRouter()
router.register("outcomes", TransferOutcomeViewSet, basename="outcome")

urlpatterns = [
    path("district-summary/", DistrictSituationSummaryView.as_view(), name="district-summary"),
    path("ask/", AskView.as_view(), name="ask"),
] + router.urls

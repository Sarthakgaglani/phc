from rest_framework.routers import DefaultRouter

from transfers.views import TransferRecommendationViewSet, TransferRequestViewSet

router = DefaultRouter()
router.register("recommendations", TransferRecommendationViewSet, basename="recommendation")
router.register("requests", TransferRequestViewSet, basename="transfer-request")

urlpatterns = router.urls

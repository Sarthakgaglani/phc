from rest_framework.routers import DefaultRouter

from locations.views import DistrictViewSet, StateViewSet

router = DefaultRouter()
router.register("states", StateViewSet, basename="state")
router.register("districts", DistrictViewSet, basename="district")

urlpatterns = router.urls

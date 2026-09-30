from rest_framework.routers import DefaultRouter

from phcs.views import PHCViewSet

router = DefaultRouter()
router.register("phcs", PHCViewSet, basename="phc")

urlpatterns = router.urls

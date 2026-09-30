from rest_framework.routers import DefaultRouter

from medicines.views import MedicineViewSet

router = DefaultRouter()
router.register("medicines", MedicineViewSet, basename="medicine")

urlpatterns = router.urls

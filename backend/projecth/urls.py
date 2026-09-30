from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/", include("locations.urls")),
    path("api/", include("phcs.urls")),
    path("api/", include("medicines.urls")),
    path("api/inventory/", include("inventory.urls")),
    path("api/capacity/", include("capacity.urls")),
    path("api/patient-activity/", include("patient_activity.urls")),
    path("api/workforce/", include("workforce.urls")),
    path("api/forecasting/", include("forecasting.urls")),
    path("api/", include("alerts.urls")),
    path("api/transfers/", include("transfers.urls")),
    path("api/analytics/", include("analytics.urls")),
]

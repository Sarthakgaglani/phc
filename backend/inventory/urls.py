from django.urls import path
from rest_framework.routers import DefaultRouter

from inventory.views import CurrentStockView, InventoryTransactionViewSet, StockMovementCreateView

router = DefaultRouter()
router.register("transactions", InventoryTransactionViewSet, basename="inventory-transaction")

urlpatterns = [
    path("stock/", CurrentStockView.as_view(), name="current-stock"),
    path("movements/", StockMovementCreateView.as_view(), name="stock-movement-create"),
] + router.urls

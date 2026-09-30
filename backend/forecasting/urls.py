from django.urls import path

from forecasting.views import StockRiskListView

urlpatterns = [
    path("stock-risk/", StockRiskListView.as_view(), name="stock-risk"),
]

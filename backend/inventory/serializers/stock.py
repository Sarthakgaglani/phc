from rest_framework import serializers


class CurrentStockSerializer(serializers.Serializer):
    """Formats a plain dict (not a queryset) produced by the view — see
    inventory.services.stock.current_stock_by_medicine()."""

    medicine = serializers.IntegerField()
    medicine_name = serializers.CharField()
    unit = serializers.CharField()
    current_stock = serializers.IntegerField()

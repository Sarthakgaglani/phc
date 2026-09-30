from rest_framework import serializers


class StockRiskSerializer(serializers.Serializer):
    medicine = serializers.IntegerField()
    medicine_name = serializers.CharField()
    unit = serializers.CharField()
    current_stock = serializers.DecimalField(max_digits=10, decimal_places=2)
    predicted_daily_consumption = serializers.DecimalField(max_digits=10, decimal_places=2)
    days_of_cover = serializers.DecimalField(
        max_digits=10, decimal_places=2, allow_null=True
    )
    shortage = serializers.DecimalField(max_digits=10, decimal_places=2)
    risk_level = serializers.CharField()

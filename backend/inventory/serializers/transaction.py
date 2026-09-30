from rest_framework import serializers

from inventory.models import InventoryTransaction


class InventoryTransactionSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source="medicine.name", read_only=True)
    phc_name = serializers.CharField(source="phc.name", read_only=True)
    recorded_by_username = serializers.CharField(source="recorded_by.username", read_only=True)

    class Meta:
        model = InventoryTransaction
        fields = [
            "id",
            "phc",
            "phc_name",
            "medicine",
            "medicine_name",
            "transaction_type",
            "quantity",
            "transaction_date",
            "recorded_by",
            "recorded_by_username",
            "notes",
            "created_at",
        ]
        read_only_fields = ["recorded_by", "created_at"]

from rest_framework import serializers

from alerts.models import Alert


class AlertSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source="medicine.name", read_only=True)
    phc_name = serializers.CharField(source="phc.name", read_only=True)

    class Meta:
        model = Alert
        fields = [
            "id",
            "phc",
            "phc_name",
            "medicine",
            "medicine_name",
            "category",
            "days_of_cover",
            "shortage",
            "is_active",
            "created_at",
            "resolved_at",
        ]

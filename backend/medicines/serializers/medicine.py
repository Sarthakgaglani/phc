from rest_framework import serializers

from medicines.models import Medicine


class MedicineSerializer(serializers.ModelSerializer):
    class Meta:
        model = Medicine
        fields = ["id", "name", "generic_name", "unit", "code", "is_active"]

from rest_framework import serializers

from phcs.models import PHC


class PHCSerializer(serializers.ModelSerializer):
    district_name = serializers.CharField(source="district.name", read_only=True)
    state_name = serializers.CharField(source="district.state.name", read_only=True)

    class Meta:
        model = PHC
        fields = [
            "id",
            "name",
            "code",
            "address",
            "is_active",
            "district",
            "district_name",
            "state_name",
        ]

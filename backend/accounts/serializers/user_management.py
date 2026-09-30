from rest_framework import serializers
from accounts.models import User, Role
from locations.models import District
from phcs.models import PHC


class UserManagementSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    phc_name = serializers.CharField(source="phc.name", read_only=True)
    district_name = serializers.CharField(source="district.name", read_only=True)
    state_name = serializers.CharField(source="state.name", read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "password",
            "first_name",
            "last_name",
            "email",
            "role",
            "state",
            "state_name",
            "district",
            "district_name",
            "phc",
            "phc_name",
            "is_active",
        ]
        read_only_fields = ["id", "state_name", "district_name", "phc_name"]

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        phc = validated_data.get("phc")
        district = validated_data.get("district")
        state = validated_data.get("state")

        # Automatically populate parent state/district for integrity if missing
        if phc:
            if not district:
                validated_data["district"] = phc.district
            if not state:
                validated_data["state"] = phc.district.state
        elif district:
            if not state:
                validated_data["state"] = district.state

        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()

        user.full_clean()
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if password:
            instance.set_password(password)

        instance.full_clean()
        instance.save()
        return instance

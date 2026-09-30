from rest_framework import serializers

from inventory.services import record_consumption, record_receipt
from medicines.models import Medicine
from phcs.models import PHC

# The manual data-entry path only ever records these two movement types
# (phase1.md: "a simple API/admin path for manually recording stock
# movements (receipts, consumption entries)"). Every other transaction type
# is written by the system itself in a later phase (transfers in Phase 5)
# or via admin for corrections (adjustment/expiry/damage).
_HANDLERS = {
    "RECEIPT": record_receipt,
    "CONSUMPTION": record_consumption,
}


class StockMovementCreateSerializer(serializers.Serializer):
    phc = serializers.PrimaryKeyRelatedField(queryset=PHC.objects.all())
    medicine = serializers.PrimaryKeyRelatedField(queryset=Medicine.objects.filter(is_active=True))
    movement_type = serializers.ChoiceField(choices=list(_HANDLERS.keys()))
    quantity = serializers.IntegerField(min_value=1)
    transaction_date = serializers.DateField(required=False)
    notes = serializers.CharField(max_length=255, required=False, allow_blank=True)

    def validate_phc(self, phc):
        request = self.context["request"]
        if not PHC.objects.for_user(request.user).filter(pk=phc.pk).exists():
            raise serializers.ValidationError("You cannot record stock movements for this PHC.")
        return phc

    def create(self, validated_data):
        handler = _HANDLERS[validated_data["movement_type"]]
        return handler(
            phc=validated_data["phc"],
            medicine=validated_data["medicine"],
            quantity=validated_data["quantity"],
            recorded_by=self.context["request"].user,
            transaction_date=validated_data.get("transaction_date"),
            notes=validated_data.get("notes", ""),
        )

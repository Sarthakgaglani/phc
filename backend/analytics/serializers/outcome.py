from rest_framework import serializers

from analytics.models import TransferOutcome


class TransferOutcomeSerializer(serializers.ModelSerializer):
    recipient_phc_name = serializers.CharField(
        source="transfer_request.recipient_phc.name", read_only=True
    )
    medicine_name = serializers.CharField(source="transfer_request.medicine.name", read_only=True)
    quantity = serializers.DecimalField(
        source="transfer_request.quantity", max_digits=10, decimal_places=2, read_only=True
    )

    class Meta:
        model = TransferOutcome
        fields = [
            "id",
            "transfer_request",
            "recipient_phc_name",
            "medicine_name",
            "quantity",
            "shortage_before",
            "risk_level_before",
            "shortage_after_receipt",
            "risk_level_after_receipt",
            "followup_due_at",
            "followup_evaluated_at",
            "shortage_averted",
        ]

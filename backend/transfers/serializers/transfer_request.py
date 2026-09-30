from rest_framework import serializers

from transfers.models import TransferApproval, TransferDispatch, TransferReceipt, TransferRequest


class TransferApprovalSerializer(serializers.ModelSerializer):
    decided_by_username = serializers.CharField(source="decided_by.username", read_only=True)

    class Meta:
        model = TransferApproval
        fields = ["decision", "decided_by_username", "reason", "created_at"]


class TransferDispatchSerializer(serializers.ModelSerializer):
    dispatched_by_username = serializers.CharField(source="dispatched_by.username", read_only=True)

    class Meta:
        model = TransferDispatch
        fields = ["dispatched_by_username", "notes", "created_at"]


class TransferReceiptSerializer(serializers.ModelSerializer):
    received_by_username = serializers.CharField(source="received_by.username", read_only=True)

    class Meta:
        model = TransferReceipt
        fields = ["received_by_username", "quantity_received", "notes", "created_at"]


class TransferRequestSerializer(serializers.ModelSerializer):
    donor_phc_name = serializers.CharField(source="donor_phc.name", read_only=True)
    recipient_phc_name = serializers.CharField(source="recipient_phc.name", read_only=True)
    medicine_name = serializers.CharField(source="medicine.name", read_only=True)
    unit = serializers.CharField(source="medicine.unit", read_only=True)
    recommendation_id = serializers.IntegerField(
        source="allocation.recommendation_id", read_only=True
    )
    approval = serializers.SerializerMethodField()
    dispatch = TransferDispatchSerializer(read_only=True, required=False)
    receipt = TransferReceiptSerializer(read_only=True, required=False)

    def get_approval(self, obj):
        latest = obj.approvals.order_by("-created_at").first()
        return TransferApprovalSerializer(latest).data if latest else None

    class Meta:
        model = TransferRequest
        fields = [
            "id",
            "recommendation_id",
            "donor_phc",
            "donor_phc_name",
            "recipient_phc",
            "recipient_phc_name",
            "medicine",
            "medicine_name",
            "unit",
            "quantity",
            "status",
            "version",
            "created_at",
            "approval",
            "dispatch",
            "receipt",
        ]
        read_only_fields = ["status", "version"]


class TransferActionSerializer(serializers.Serializer):
    """Shared input shape for approve/reject/dispatch/receive: the client's
    last-known version (optimistic-locking) and an idempotency key it should
    reuse verbatim if it retries this exact action."""

    version = serializers.IntegerField()
    idempotency_key = serializers.CharField(max_length=64)
    reason = serializers.CharField(max_length=255, required=False, allow_blank=True)
    notes = serializers.CharField(max_length=255, required=False, allow_blank=True)

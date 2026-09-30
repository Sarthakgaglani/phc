from rest_framework import serializers

from transfers.models import TransferRecommendation, TransferRecommendationAllocation


class RecommendationAllocationSerializer(serializers.ModelSerializer):
    """
    One donor's slice of a recommendation, with the reasoning fields the
    explainability panel needs inline — no separate "why" endpoint per
    CLAUDE.md's explainability UI requirement.
    """

    donor_phc_name = serializers.CharField(source="donor_phc.name", read_only=True)
    donor_district_name = serializers.CharField(
        source="donor_phc.district.name", read_only=True
    )

    class Meta:
        model = TransferRecommendationAllocation
        fields = [
            "id",
            "donor_phc",
            "donor_phc_name",
            "donor_district_name",
            "quantity",
            "donor_current_stock",
            "donor_predicted_daily_consumption",
            "donor_required_stock",
            "donor_safe_surplus_before",
            "donor_days_of_cover_before",
            "donor_days_of_cover_after",
            "distance_km",
            "rank",
        ]


class TransferRecommendationSerializer(serializers.ModelSerializer):
    recipient_phc_name = serializers.CharField(source="recipient_phc.name", read_only=True)
    recipient_district_name = serializers.CharField(
        source="recipient_phc.district.name", read_only=True
    )
    medicine_name = serializers.CharField(source="medicine.name", read_only=True)
    unit = serializers.CharField(source="medicine.unit", read_only=True)
    allocations = RecommendationAllocationSerializer(many=True, read_only=True)

    class Meta:
        model = TransferRecommendation
        fields = [
            "id",
            "recipient_phc",
            "recipient_phc_name",
            "recipient_district_name",
            "medicine",
            "medicine_name",
            "unit",
            "recipient_current_stock",
            "recipient_predicted_daily_consumption",
            "recipient_predicted_demand",
            "recipient_safety_stock",
            "recipient_required_stock",
            "recipient_shortage",
            "unresolved_shortage",
            "is_superseded",
            "created_at",
            "allocations",
        ]

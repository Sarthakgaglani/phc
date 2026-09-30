from rest_framework import serializers


class StaffSummarySerializer(serializers.Serializer):
    phc = serializers.IntegerField()
    phc_name = serializers.CharField()
    staff_total = serializers.IntegerField()
    staff_present = serializers.IntegerField()

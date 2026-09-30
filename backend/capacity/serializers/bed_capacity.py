from rest_framework import serializers


class BedCapacitySummarySerializer(serializers.Serializer):
    phc = serializers.IntegerField()
    phc_name = serializers.CharField()
    total_beds = serializers.IntegerField()
    occupied_beds = serializers.IntegerField()
    pressure_level = serializers.CharField()

from rest_framework import serializers


class FootfallSummarySerializer(serializers.Serializer):
    phc = serializers.IntegerField()
    phc_name = serializers.CharField()
    visit_count = serializers.IntegerField()

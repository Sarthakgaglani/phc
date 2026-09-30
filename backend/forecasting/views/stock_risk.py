from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import RiskConfig
from forecasting.serializers import StockRiskSerializer
from forecasting.services import get_current_stock_risk
from medicines.models import Medicine
from phcs.models import PHC


class StockRiskListView(APIView):
    """
    GET /api/forecasting/stock-risk/?phc=<id> — the real Days-of-Cover-based
    risk per medicine (phase3.md), replacing the placeholder risk logic the
    Phase 1 dashboard used.
    """

    def get(self, request):
        phc_id = request.query_params.get("phc")
        if not phc_id:
            raise ValidationError({"phc": "This query parameter is required."})
        try:
            phc = PHC.objects.for_user(request.user).get(pk=phc_id)
        except PHC.DoesNotExist:
            raise PermissionDenied("You cannot view risk data for this PHC.")

        config = RiskConfig.objects.current()
        rows = []
        for medicine in Medicine.objects.filter(is_active=True):
            risk = get_current_stock_risk(phc, medicine, config=config)
            rows.append(
                {
                    "medicine": medicine.id,
                    "medicine_name": medicine.name,
                    "unit": medicine.unit,
                    "current_stock": risk.current_stock,
                    "predicted_daily_consumption": risk.predicted_daily_consumption,
                    "days_of_cover": risk.days_of_cover,
                    "shortage": risk.shortage,
                    "risk_level": risk.risk_level,
                }
            )
        return Response(StockRiskSerializer(rows, many=True).data)

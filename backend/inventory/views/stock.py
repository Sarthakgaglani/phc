from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from inventory.serializers import CurrentStockSerializer
from inventory.services import current_stock_by_medicine
from medicines.models import Medicine
from phcs.models import PHC


class CurrentStockView(APIView):
    """
    GET /api/inventory/stock/?phc=<id> — current stock for every active
    medicine at a PHC, derived live from the ledger. This is what the PHC
    Dashboard v1 renders (phase1.md).
    """

    def get(self, request):
        phc_id = request.query_params.get("phc")
        if not phc_id:
            raise ValidationError({"phc": "This query parameter is required."})
        try:
            phc = PHC.objects.for_user(request.user).get(pk=phc_id)
        except PHC.DoesNotExist:
            raise PermissionDenied("You cannot view stock for this PHC.")

        stock_by_medicine = current_stock_by_medicine(phc)
        rows = [
            {
                "medicine": medicine.id,
                "medicine_name": medicine.name,
                "unit": medicine.unit,
                "current_stock": stock_by_medicine.get(medicine.id, 0),
            }
            for medicine in Medicine.objects.filter(is_active=True)
        ]
        return Response(CurrentStockSerializer(rows, many=True).data)

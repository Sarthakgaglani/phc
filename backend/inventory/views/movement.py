from rest_framework import generics, status
from rest_framework.response import Response

from inventory.serializers import InventoryTransactionSerializer, StockMovementCreateSerializer


class StockMovementCreateView(generics.CreateAPIView):
    """POST-only entry point for the manual receipt/consumption data-entry form."""

    serializer_class = StockMovementCreateSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        transaction = serializer.save()
        return Response(
            InventoryTransactionSerializer(transaction).data, status=status.HTTP_201_CREATED
        )

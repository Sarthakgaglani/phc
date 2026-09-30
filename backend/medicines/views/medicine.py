from rest_framework import viewsets

from medicines.models import Medicine
from medicines.serializers import MedicineSerializer


class MedicineViewSet(viewsets.ReadOnlyModelViewSet):
    """
    The medicine catalog is shared platform-wide (not RBAC-scoped) — any
    authenticated user can read it, same as a real-world drug formulary.
    Managed via admin until a catalog-management need justifies an API.
    """

    queryset = Medicine.objects.filter(is_active=True)
    serializer_class = MedicineSerializer

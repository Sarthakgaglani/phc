from django.db import models

from core.models import TimeStampedModel
from core.rbac import role_scoped_manager


class PHC(TimeStampedModel):
    district = models.ForeignKey(
        "locations.District", on_delete=models.PROTECT, related_name="phcs"
    )
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=20, unique=True)
    address = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)

    # Nullable: only used for Phase 4's donor-distance ranking (a simple
    # haversine calculation, per phase4.md's "simple lat/long calculation is
    # fine for MVP"). PHCs without coordinates just skip distance ranking
    # rather than blocking matching.
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    objects = role_scoped_manager(
        state_id_lookup="district__state_id",
        district_id_lookup="district_id",
        phc_id_lookup="id",
    )

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.district.name})"

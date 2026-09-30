from django.db import models

from core.models import TimeStampedModel
from core.rbac import role_scoped_manager


class District(TimeStampedModel):
    state = models.ForeignKey("locations.State", on_delete=models.PROTECT, related_name="districts")
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=10)

    objects = role_scoped_manager(
        state_id_lookup="state_id",
        district_id_lookup="id",
        phc_id_lookup="phcs__id",
    )

    class Meta:
        ordering = ["name"]
        unique_together = ("state", "code")

    def __str__(self):
        return f"{self.name}, {self.state.code}"

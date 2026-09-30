from django.db import models

from core.models import TimeStampedModel
from core.rbac import role_scoped_manager


class State(TimeStampedModel):
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=10, unique=True)

    objects = role_scoped_manager(
        state_id_lookup="id",
        district_id_lookup="districts__id",
        phc_id_lookup="districts__phcs__id",
    )

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

from django.core.exceptions import ValidationError
from django.db import models

from core.models import TimeStampedModel
from core.rbac import role_scoped_manager


class BedCapacity(TimeStampedModel):
    """Daily bed-capacity snapshot per PHC (total vs. occupied)."""

    phc = models.ForeignKey(
        "phcs.PHC", on_delete=models.PROTECT, related_name="bed_capacity_records"
    )
    date = models.DateField()
    total_beds = models.PositiveIntegerField()
    occupied_beds = models.PositiveIntegerField()

    objects = role_scoped_manager()

    class Meta:
        ordering = ["-date"]
        unique_together = ("phc", "date")
        indexes = [models.Index(fields=["phc", "date"])]

    def __str__(self):
        return f"{self.phc} / {self.date} / {self.occupied_beds}/{self.total_beds}"

    def clean(self):
        if self.occupied_beds > self.total_beds:
            raise ValidationError("Occupied beds cannot exceed total beds.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

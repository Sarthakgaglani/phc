from django.db import models

from core.models import TimeStampedModel
from core.rbac import role_scoped_manager


class PatientFootfall(TimeStampedModel):
    """
    Aggregated daily visit counts only — never patient-level records. This
    is an explicit privacy boundary (CLAUDE.md / phase2.md), not just a
    modeling convenience: no field here should ever be able to identify an
    individual patient.
    """

    phc = models.ForeignKey("phcs.PHC", on_delete=models.PROTECT, related_name="footfall_records")
    date = models.DateField()
    visit_count = models.PositiveIntegerField()

    objects = role_scoped_manager()

    class Meta:
        ordering = ["-date"]
        unique_together = ("phc", "date")
        indexes = [models.Index(fields=["phc", "date"])]

    def __str__(self):
        return f"{self.phc} / {self.date} / {self.visit_count}"

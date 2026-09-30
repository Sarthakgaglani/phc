from django.db import models

from core.models import TimeStampedModel
from core.rbac import role_scoped_manager


class StaffMember(TimeStampedModel):
    phc = models.ForeignKey("phcs.PHC", on_delete=models.PROTECT, related_name="staff_members")
    name = models.CharField(max_length=150)
    role_title = models.CharField(max_length=100, help_text="e.g. Pharmacist, ANM, Medical Officer")
    is_active = models.BooleanField(default=True)

    objects = role_scoped_manager()

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.role_title})"

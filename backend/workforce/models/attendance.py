from django.db import models

from core.models import TimeStampedModel
from core.rbac import role_scoped_manager


class StaffAttendance(TimeStampedModel):
    staff_member = models.ForeignKey(
        "workforce.StaffMember", on_delete=models.PROTECT, related_name="attendance_records"
    )
    date = models.DateField()
    present = models.BooleanField()

    objects = role_scoped_manager(
        state_id_lookup="staff_member__phc__district__state_id",
        district_id_lookup="staff_member__phc__district_id",
        phc_id_lookup="staff_member__phc_id",
    )

    class Meta:
        ordering = ["-date"]
        unique_together = ("staff_member", "date")
        indexes = [models.Index(fields=["staff_member", "date"])]

    def __str__(self):
        return f"{self.staff_member} / {self.date} / {'present' if self.present else 'absent'}"

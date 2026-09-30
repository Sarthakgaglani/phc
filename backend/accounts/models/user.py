from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.db import models

from accounts.models.role import Role


class User(AbstractUser):
    """
    Every user has exactly one role and is anchored to the corresponding
    level of the location hierarchy (locations.State / locations.District /
    phcs.PHC). That anchor is what core.rbac scopes every queryset by.
    """

    role = models.CharField(max_length=20, choices=Role.choices)

    state = models.ForeignKey(
        "locations.State", null=True, blank=True, on_delete=models.PROTECT, related_name="users"
    )
    district = models.ForeignKey(
        "locations.District", null=True, blank=True, on_delete=models.PROTECT, related_name="users"
    )
    phc = models.ForeignKey(
        "phcs.PHC", null=True, blank=True, on_delete=models.PROTECT, related_name="users"
    )

    def clean(self):
        super().clean()
        if self.role == Role.NATIONAL:
            # National admin has no location anchor — sees everything
            return
        if self.role == Role.PHC:
            if not self.phc_id:
                raise ValidationError("A PHC-role user must be assigned a PHC.")
            if self.district_id and self.phc.district_id != self.district_id:
                raise ValidationError("Assigned district must match the PHC's district.")
            if self.state_id and self.phc.district.state_id != self.state_id:
                raise ValidationError("Assigned state must match the PHC's state.")
        elif self.role == Role.DISTRICT:
            if not self.district_id:
                raise ValidationError("A District-role user must be assigned a district.")
            if self.state_id and self.district.state_id != self.state_id:
                raise ValidationError("Assigned state must match the district's state.")
        elif self.role == Role.STATE:
            if not self.state_id:
                raise ValidationError("A State-role user must be assigned a state.")

    def __str__(self):
        return f"{self.username} ({self.role})"

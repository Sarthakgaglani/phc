from django.db import models

from core.models import TimeStampedModel


class Medicine(TimeStampedModel):
    """
    The medicine catalog — shared across the whole platform, not scoped to
    any PHC/district/state, so it deliberately does not use
    core.rbac.role_scoped_manager.
    """

    name = models.CharField(max_length=150, unique=True)
    generic_name = models.CharField(max_length=150, blank=True)
    unit = models.CharField(max_length=30, help_text="e.g. tablets, ml, vials")
    code = models.CharField(max_length=30, unique=True, blank=True, null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

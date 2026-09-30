from django.db import models


class Role(models.TextChoices):
    PHC = "PHC", "PHC staff"
    DISTRICT = "DISTRICT", "District officer"
    STATE = "STATE", "State admin"
    NATIONAL = "NATIONAL", "National admin"

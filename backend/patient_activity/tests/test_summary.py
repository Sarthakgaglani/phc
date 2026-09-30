import datetime

import pytest
from rest_framework.test import APIClient

from accounts.models import Role, User
from locations.models import District, State
from patient_activity.models import PatientFootfall
from phcs.models import PHC

DISALLOWED_FIELD_HINTS = ("patient", "name", "phone", "aadhaar", "dob", "address")


def test_footfall_model_has_no_patient_identifying_fields():
    """Structural guard for the privacy boundary in CLAUDE.md/phase2.md:
    only aggregated counts, never anything that could identify a patient."""
    field_names = {f.name for f in PatientFootfall._meta.get_fields()}
    allowed = {"id", "phc", "date", "visit_count", "created_at", "updated_at"}
    assert field_names <= allowed


@pytest.mark.django_db
def test_footfall_summary_uses_latest_date(db):
    state = State.objects.create(name="S", code="S")
    district = District.objects.create(state=state, name="D", code="D")
    phc = PHC.objects.create(district=district, name="P", code="P")
    PatientFootfall.objects.create(phc=phc, date=datetime.date(2026, 1, 1), visit_count=50)
    PatientFootfall.objects.create(phc=phc, date=datetime.date(2026, 1, 2), visit_count=142)
    user = User.objects.create_user(
        "du", password="x", role=Role.DISTRICT, state=state, district=district
    )

    client = APIClient()
    client.force_authenticate(user=user)
    response = client.get(f"/api/patient-activity/summary/?district={district.id}")

    assert response.status_code == 200
    assert response.data[0]["visit_count"] == 142

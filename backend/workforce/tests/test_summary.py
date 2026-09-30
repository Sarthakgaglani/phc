import datetime

import pytest
from rest_framework.test import APIClient

from accounts.models import Role, User
from locations.models import District, State
from phcs.models import PHC
from workforce.models import StaffAttendance, StaffMember


@pytest.fixture
def setup(db):
    state = State.objects.create(name="S", code="S")
    district = District.objects.create(state=state, name="D", code="D")
    phc = PHC.objects.create(district=district, name="P", code="P")

    alice = StaffMember.objects.create(phc=phc, name="Alice", role_title="ANM")
    bob = StaffMember.objects.create(phc=phc, name="Bob", role_title="Pharmacist")
    StaffMember.objects.create(phc=phc, name="Carl", role_title="MO", is_active=False)

    StaffAttendance.objects.create(staff_member=alice, date=datetime.date(2026, 1, 5), present=True)
    StaffAttendance.objects.create(staff_member=bob, date=datetime.date(2026, 1, 5), present=False)

    district_user = User.objects.create_user(
        "du", password="x", role=Role.DISTRICT, state=state, district=district
    )
    return district, phc, district_user


@pytest.mark.django_db
def test_staff_summary_counts_present_on_latest_date_and_excludes_inactive(setup):
    district, phc, district_user = setup
    client = APIClient()
    client.force_authenticate(user=district_user)

    response = client.get(f"/api/workforce/summary/?district={district.id}")
    assert response.status_code == 200
    row = response.data[0]
    assert row["phc"] == phc.id
    assert row["staff_total"] == 2  # Carl is inactive, excluded
    assert row["staff_present"] == 1  # only Alice present

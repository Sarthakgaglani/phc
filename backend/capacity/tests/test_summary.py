import datetime

import pytest
from rest_framework.test import APIClient

from accounts.models import Role, User
from capacity.models import BedCapacity
from locations.models import District, State
from phcs.models import PHC


@pytest.fixture
def setup(db):
    state = State.objects.create(name="S", code="S")
    d1 = State.objects.create(name="S2", code="S2")
    district_a = District.objects.create(state=state, name="DA", code="DA")
    district_b = District.objects.create(state=d1, name="DB", code="DB")
    phc1 = PHC.objects.create(district=district_a, name="P1", code="P1")
    phc2 = PHC.objects.create(district=district_a, name="P2", code="P2")
    phc_other = PHC.objects.create(district=district_b, name="P3", code="P3")

    d1_date, d2_date = datetime.date(2026, 1, 1), datetime.date(2026, 1, 2)
    BedCapacity.objects.create(phc=phc1, date=d1_date, total_beds=20, occupied_beds=10)
    BedCapacity.objects.create(phc=phc1, date=d2_date, total_beds=20, occupied_beds=18)
    BedCapacity.objects.create(phc=phc2, date=d2_date, total_beds=10, occupied_beds=4)

    district_user = User.objects.create_user(
        "du", password="x", role=Role.DISTRICT, state=state, district=district_a
    )
    return district_a, phc1, phc2, phc_other, district_user


@pytest.mark.django_db
def test_summary_returns_latest_snapshot_per_phc(setup):
    district_a, phc1, phc2, _phc_other, district_user = setup
    client = APIClient()
    client.force_authenticate(user=district_user)

    response = client.get(f"/api/capacity/summary/?district={district_a.id}")
    assert response.status_code == 200
    by_phc = {row["phc"]: row for row in response.data}

    assert by_phc[phc1.id]["occupied_beds"] == 18  # latest date, not the first
    assert by_phc[phc2.id]["occupied_beds"] == 4
    assert by_phc[phc1.id]["pressure_level"] == "critical"  # 18/20 = 90%
    assert by_phc[phc2.id]["pressure_level"] == "safe"  # 4/10 = 40%


@pytest.mark.django_db
def test_district_user_cannot_view_another_districts_summary(setup):
    _district_a, _phc1, _phc2, phc_other, district_user = setup
    client = APIClient()
    client.force_authenticate(user=district_user)

    response = client.get(f"/api/capacity/summary/?district={phc_other.district_id}")
    assert response.status_code == 403

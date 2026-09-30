"""
Phase 0 done-criterion: "a PHC-role user cannot query another PHC's data
through the API." Exercised at the real API layer (not just the queryset)
so it proves the RBAC scoping built in core.rbac is actually wired into the
view, not merely correct in isolation.
"""
import pytest
from rest_framework.test import APIClient

from accounts.models import Role, User
from locations.models import District, State
from phcs.models import PHC


@pytest.fixture
def location_tree(db):
    state = State.objects.create(name="Test State", code="TS")
    district_a = District.objects.create(state=state, name="District A", code="DA")
    district_b = District.objects.create(state=state, name="District B", code="DB")
    phc_a = PHC.objects.create(district=district_a, name="PHC A", code="PA")
    phc_b = PHC.objects.create(district=district_a, name="PHC B", code="PB")
    phc_c = PHC.objects.create(district=district_b, name="PHC C", code="PC")
    return {
        "state": state,
        "district_a": district_a,
        "district_b": district_b,
        "phc_a": phc_a,
        "phc_b": phc_b,
        "phc_c": phc_c,
    }


def make_user(role, **scope):
    suffix = scope.get("phc_id") or scope.get("district_id") or scope.get("state_id")
    user = User(username=f"user_{role}_{suffix}", role=role, **scope)
    user.set_password("x")
    user.save()
    return user


@pytest.mark.django_db
def test_phc_user_sees_only_own_phc(location_tree):
    phc_a, phc_b = location_tree["phc_a"], location_tree["phc_b"]
    user = make_user(
        Role.PHC, state=location_tree["state"], district=location_tree["district_a"], phc=phc_a
    )

    client = APIClient()
    client.force_authenticate(user=user)
    response = client.get("/api/phcs/")

    assert response.status_code == 200
    codes = {row["code"] for row in response.data}
    assert phc_a.code in codes
    assert phc_b.code not in codes
    assert location_tree["phc_c"].code not in codes


@pytest.mark.django_db
def test_phc_user_cannot_retrieve_another_phcs_detail(location_tree):
    phc_a, phc_b = location_tree["phc_a"], location_tree["phc_b"]
    user = make_user(
        Role.PHC, state=location_tree["state"], district=location_tree["district_a"], phc=phc_a
    )

    client = APIClient()
    client.force_authenticate(user=user)
    response = client.get(f"/api/phcs/{phc_b.id}/")

    assert response.status_code == 404


@pytest.mark.django_db
def test_district_user_sees_all_phcs_in_district_but_not_other_district(location_tree):
    user = make_user(
        Role.DISTRICT, state=location_tree["state"], district=location_tree["district_a"]
    )

    client = APIClient()
    client.force_authenticate(user=user)
    response = client.get("/api/phcs/")

    codes = {row["code"] for row in response.data}
    assert location_tree["phc_a"].code in codes
    assert location_tree["phc_b"].code in codes
    assert location_tree["phc_c"].code not in codes


@pytest.mark.django_db
def test_state_user_sees_every_phc_in_state(location_tree):
    user = make_user(Role.STATE, state=location_tree["state"])

    client = APIClient()
    client.force_authenticate(user=user)
    response = client.get("/api/phcs/")

    codes = {row["code"] for row in response.data}
    assert codes == {
        location_tree["phc_a"].code,
        location_tree["phc_b"].code,
        location_tree["phc_c"].code,
    }


@pytest.mark.django_db
def test_unauthenticated_request_is_rejected(location_tree):
    client = APIClient()
    response = client.get("/api/phcs/")
    assert response.status_code == 401

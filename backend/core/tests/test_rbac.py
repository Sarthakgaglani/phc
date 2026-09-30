"""Unit-level coverage of the RBAC manager itself (core.rbac), independent
of any view — this is the mechanism every future scoped model reuses, so it
gets its own direct test rather than only being proven indirectly through
phcs' API-level RBAC test.
"""
import pytest

from accounts.models import Role, User
from locations.models import District, State
from phcs.models import PHC


@pytest.fixture
def tree(db):
    state = State.objects.create(name="Test State", code="TS")
    d1 = District.objects.create(state=state, name="D1", code="D1")
    d2 = District.objects.create(state=state, name="D2", code="D2")
    p1 = PHC.objects.create(district=d1, name="P1", code="P1")
    p2 = PHC.objects.create(district=d2, name="P2", code="P2")
    return state, d1, d2, p1, p2


@pytest.mark.django_db
def test_superuser_sees_everything(tree):
    state, d1, d2, p1, p2 = tree
    admin = User.objects.create_superuser("admin", password="x")
    assert set(PHC.objects.for_user(admin)) == {p1, p2}


@pytest.mark.django_db
def test_anonymous_and_none_user_see_nothing(tree):
    assert PHC.objects.for_user(None).count() == 0


@pytest.mark.django_db
def test_district_manager_scopes_by_state_and_district(tree):
    state, d1, d2, p1, p2 = tree
    state_user = User.objects.create_user("su", password="x", role=Role.STATE, state=state)
    district_user = User.objects.create_user(
        "du", password="x", role=Role.DISTRICT, state=state, district=d1
    )

    assert set(District.objects.for_user(state_user)) == {d1, d2}
    assert set(District.objects.for_user(district_user)) == {d1}

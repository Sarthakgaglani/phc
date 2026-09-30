import datetime

import pytest
from rest_framework.test import APIClient

from accounts.models import Role, User
from forecasting.services import forecast
from inventory.services import record_consumption, record_receipt
from locations.models import District, State
from medicines.models import Medicine
from phcs.models import PHC
from transfers.services import build_recommendation, state_machine

TODAY = datetime.date(2026, 3, 1)


@pytest.fixture
def setup(db):
    state = State.objects.create(name="S", code="S")
    district = District.objects.create(state=state, name="D", code="D")
    recipient = PHC.objects.create(
        district=district, name="Recipient", code="R", latitude=0, longitude=0
    )
    donor = PHC.objects.create(
        district=district, name="Donor", code="DN", latitude=0.5, longitude=0.5
    )
    medicine = Medicine.objects.create(name="ORS", unit="packets")
    user = User.objects.create_user("seed", password="x", role=Role.STATE, state=state)
    return recipient, donor, medicine, user


def _consume_daily(phc, medicine, user, daily_qty, days):
    for offset in range(1, days + 1):
        record_consumption(
            phc, medicine, daily_qty, user, transaction_date=TODAY - datetime.timedelta(days=offset)
        )


def _seed_recipient_shortage_and_donor_surplus(recipient, donor, medicine, user):
    old = TODAY - datetime.timedelta(days=40)
    record_receipt(recipient, medicine, 50, user, transaction_date=old)
    _consume_daily(recipient, medicine, user, 10, 30)

    record_receipt(donor, medicine, 2000, user, transaction_date=old)
    _consume_daily(donor, medicine, user, 5, 30)

    forecast(recipient, medicine, as_of=TODAY)
    forecast(donor, medicine, as_of=TODAY)


@pytest.mark.django_db
def test_build_recommendation_matches_shortage_to_safe_donor(setup):
    recipient, donor, medicine, user = setup
    _seed_recipient_shortage_and_donor_surplus(recipient, donor, medicine, user)

    recommendation = build_recommendation(recipient, medicine)

    assert recommendation is not None
    assert recommendation.recipient_phc == recipient
    assert recommendation.recipient_shortage > 0
    allocations = list(recommendation.allocations.all())
    assert len(allocations) == 1
    assert allocations[0].donor_phc == donor
    assert allocations[0].quantity > 0
    assert allocations[0].quantity <= allocations[0].donor_safe_surplus_before


@pytest.mark.django_db
def test_build_recommendation_returns_none_without_a_shortage(setup):
    recipient, donor, medicine, user = setup
    record_receipt(recipient, medicine, 5000, user)

    assert build_recommendation(recipient, medicine) is None


@pytest.mark.django_db
def test_build_recommendation_supersedes_the_previous_open_one(setup):
    recipient, donor, medicine, user = setup
    _seed_recipient_shortage_and_donor_surplus(recipient, donor, medicine, user)

    first = build_recommendation(recipient, medicine)
    second = build_recommendation(recipient, medicine)

    first.refresh_from_db()
    assert first.is_superseded is True
    assert second.is_superseded is False


@pytest.mark.django_db
def test_build_recommendation_does_not_supersede_an_approved_in_flight_one(setup):
    recipient, donor, medicine, user = setup
    _seed_recipient_shortage_and_donor_surplus(recipient, donor, medicine, user)

    first = build_recommendation(recipient, medicine)
    [transfer_request] = state_machine.create_requests_for_recommendation(first)
    state_machine.approve(transfer_request.id, user, expected_version=0, idempotency_key="k1")

    second = build_recommendation(recipient, medicine)

    first.refresh_from_db()
    assert first.is_superseded is False
    assert second is None or second.id != first.id


@pytest.mark.django_db
def test_recommendation_api_scoped_to_recipient_and_donor_phc_users(setup):
    recipient, donor, medicine, user = setup
    _seed_recipient_shortage_and_donor_surplus(recipient, donor, medicine, user)
    build_recommendation(recipient, medicine)

    other_district = District.objects.create(
        state=recipient.district.state, name="Other", code="OT"
    )
    other_phc = PHC.objects.create(district=other_district, name="Unrelated", code="UN")

    recipient_user = User.objects.create_user(
        "r_staff", password="x", role=Role.PHC, phc=recipient,
        district=recipient.district, state=recipient.district.state,
    )
    donor_user = User.objects.create_user(
        "d_staff", password="x", role=Role.PHC, phc=donor,
        district=donor.district, state=donor.district.state,
    )
    unrelated_user = User.objects.create_user(
        "u_staff", password="x", role=Role.PHC, phc=other_phc,
        district=other_district, state=other_district.state,
    )

    client = APIClient()

    client.force_authenticate(user=recipient_user)
    assert len(client.get("/api/transfers/recommendations/").data) == 1

    client.force_authenticate(user=donor_user)
    assert len(client.get("/api/transfers/recommendations/").data) == 1

    client.force_authenticate(user=unrelated_user)
    assert len(client.get("/api/transfers/recommendations/").data) == 0

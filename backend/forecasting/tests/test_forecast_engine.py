import datetime
from decimal import Decimal

import pytest

from accounts.models import Role, User
from forecasting.services import forecast, latest_forecast
from inventory.services import record_consumption, record_receipt
from locations.models import District, State
from medicines.models import Medicine
from phcs.models import PHC


@pytest.fixture
def setup(db):
    state = State.objects.create(name="S", code="S")
    district = District.objects.create(state=state, name="D", code="D")
    phc = PHC.objects.create(district=district, name="P", code="P")
    medicine = Medicine.objects.create(name="Paracetamol", unit="tablets")
    user = User.objects.create_user(
        "staff", password="x", role=Role.PHC, state=state, district=district, phc=phc
    )
    return phc, medicine, user


@pytest.mark.django_db
def test_forecast_with_no_history_is_zero(setup):
    phc, medicine, _user = setup
    result = forecast(phc, medicine)
    assert result.predicted_daily_consumption == Decimal("0")
    assert result.predicted_demand == Decimal("0")


@pytest.mark.django_db
def test_forecast_reflects_recent_consumption(setup):
    phc, medicine, user = setup
    record_receipt(phc, medicine, 1000, user, transaction_date=datetime.date(2026, 1, 1))
    today = datetime.date(2026, 2, 1)
    for day_offset in range(10):
        record_consumption(
            phc, medicine, 10, user,
            transaction_date=today - datetime.timedelta(days=day_offset + 1),
        )

    result = forecast(phc, medicine, horizon_days=7, as_of=today)
    assert result.predicted_daily_consumption > Decimal("0")
    assert result.predicted_demand == result.predicted_daily_consumption * 7
    assert result.horizon_days == 7


@pytest.mark.django_db
def test_forecast_is_logged_not_overwritten(setup):
    phc, medicine, user = setup
    forecast(phc, medicine)
    forecast(phc, medicine)
    from forecasting.models import DemandForecast

    assert DemandForecast.objects.filter(phc=phc, medicine=medicine).count() == 2
    assert latest_forecast(phc, medicine) is not None


@pytest.mark.django_db
def test_more_recent_consumption_weighted_higher(setup):
    """A weighted moving average should respond more to recent days than a
    plain average would — this is the "weighted" part of the algorithm."""
    phc, medicine, user = setup
    today = datetime.date(2026, 3, 1)
    record_receipt(phc, medicine, 10000, user, transaction_date=datetime.date(2026, 1, 1))
    # Heavy consumption only in the most recent 3 days of a 30-day window.
    for day_offset in range(1, 4):
        record_consumption(
            phc, medicine, 100, user, transaction_date=today - datetime.timedelta(days=day_offset)
        )

    result = forecast(phc, medicine, as_of=today)
    plain_average = Decimal(300) / 30
    assert result.predicted_daily_consumption > plain_average

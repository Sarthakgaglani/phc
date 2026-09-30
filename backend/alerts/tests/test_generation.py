from decimal import Decimal

import pytest

from accounts.models import Role, User
from alerts.models import Alert, AlertCategory
from alerts.services import sync_alerts_for
from forecasting.services import StockRisk
from locations.models import District, State
from medicines.models import Medicine
from phcs.models import PHC


@pytest.fixture
def setup(db):
    state = State.objects.create(name="S", code="S")
    district = District.objects.create(state=state, name="D", code="D")
    phc = PHC.objects.create(district=district, name="P", code="P")
    medicine = Medicine.objects.create(name="Paracetamol", unit="tablets")
    User.objects.create_user(
        "staff", password="x", role=Role.PHC, state=state, district=district, phc=phc
    )
    return phc, medicine


def _risk(phc, medicine, risk_level, shortage=Decimal("0"), days_of_cover=None):
    return StockRisk(
        phc_id=phc.id,
        medicine_id=medicine.id,
        current_stock=Decimal("10"),
        predicted_daily_consumption=Decimal("1"),
        predicted_demand=Decimal("10"),
        safety_stock=Decimal("5"),
        required_stock=Decimal("15"),
        shortage=shortage,
        safe_surplus=Decimal("0"),
        days_of_cover=days_of_cover,
        risk_level=risk_level,
    )


@pytest.mark.django_db
def test_critical_risk_creates_alert(setup):
    phc, medicine = setup
    sync_alerts_for(phc, medicine, _risk(phc, medicine, "critical", days_of_cover=Decimal("1")))

    alerts = Alert.objects.filter(phc=phc, medicine=medicine, is_active=True)
    assert alerts.count() == 1
    assert alerts.first().category == AlertCategory.CRITICAL_STOCK_OUT_RISK


@pytest.mark.django_db
def test_shortage_without_low_dos_still_creates_below_safety_alert(setup):
    phc, medicine = setup
    sync_alerts_for(phc, medicine, _risk(phc, medicine, "safe", shortage=Decimal("5")))

    categories = set(
        Alert.objects.filter(phc=phc, medicine=medicine, is_active=True).values_list(
            "category", flat=True
        )
    )
    assert categories == {AlertCategory.BELOW_SAFETY_THRESHOLD}


@pytest.mark.django_db
def test_resolved_condition_deactivates_alert_rather_than_deleting(setup):
    phc, medicine = setup
    sync_alerts_for(phc, medicine, _risk(phc, medicine, "critical", days_of_cover=Decimal("1")))
    sync_alerts_for(phc, medicine, _risk(phc, medicine, "safe"))

    all_alerts = Alert.objects.filter(phc=phc, medicine=medicine)
    assert all_alerts.count() == 1  # not deleted
    alert = all_alerts.first()
    assert alert.is_active is False
    assert alert.resolved_at is not None


@pytest.mark.django_db
def test_repeated_sync_does_not_duplicate_active_alerts(setup):
    phc, medicine = setup
    risk = _risk(phc, medicine, "critical", days_of_cover=Decimal("1"))
    sync_alerts_for(phc, medicine, risk)
    sync_alerts_for(phc, medicine, risk)

    assert Alert.objects.filter(phc=phc, medicine=medicine, is_active=True).count() == 1

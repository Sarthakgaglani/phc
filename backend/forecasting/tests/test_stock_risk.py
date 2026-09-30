from decimal import Decimal

import pytest

from core.models import RiskConfig
from forecasting.services import compute_stock_risk


@pytest.fixture
def config(db):
    return RiskConfig.objects.current()


@pytest.mark.django_db
def test_required_stock_and_shortage_formulas(config):
    config.default_safety_stock_days = 7
    config.save()

    risk = compute_stock_risk(
        phc_id=1,
        medicine_id=1,
        current_stock=50,
        predicted_daily_consumption=Decimal("10"),
        predicted_demand=Decimal("140"),  # 14-day horizon at 10/day
        config=config,
    )

    # Required = predicted_demand + (daily_consumption * safety_stock_days)
    assert risk.safety_stock == Decimal("70")
    assert risk.required_stock == Decimal("210")
    assert risk.shortage == Decimal("160")
    assert risk.safe_surplus == Decimal("0")


@pytest.mark.django_db
def test_safe_surplus_when_current_stock_exceeds_required(config):
    risk = compute_stock_risk(
        phc_id=1,
        medicine_id=1,
        current_stock=1000,
        predicted_daily_consumption=Decimal("5"),
        predicted_demand=Decimal("70"),
        config=config,
    )
    assert risk.shortage == Decimal("0")
    assert risk.safe_surplus > Decimal("0")


@pytest.mark.django_db
def test_days_of_cover_is_current_stock_over_daily_consumption(config):
    risk = compute_stock_risk(
        phc_id=1,
        medicine_id=1,
        current_stock=100,
        predicted_daily_consumption=Decimal("20"),
        predicted_demand=Decimal("280"),
        config=config,
    )
    assert risk.days_of_cover == Decimal("5")


@pytest.mark.django_db
def test_days_of_cover_is_none_with_zero_consumption(config):
    risk = compute_stock_risk(
        phc_id=1,
        medicine_id=1,
        current_stock=100,
        predicted_daily_consumption=Decimal("0"),
        predicted_demand=Decimal("0"),
        config=config,
    )
    assert risk.days_of_cover is None
    assert risk.risk_level == "safe"


@pytest.mark.django_db
def test_risk_level_thresholds_are_read_from_config_not_hardcoded(config):
    config.critical_risk_days_of_cover = Decimal("1")
    config.high_risk_days_of_cover = Decimal("2")
    config.medium_risk_days_of_cover = Decimal("3")
    config.save()

    # 2.5 days of cover would normally be "high" under the default
    # thresholds (<=7) but is "medium" under this narrower config.
    risk = compute_stock_risk(
        phc_id=1,
        medicine_id=1,
        current_stock=25,
        predicted_daily_consumption=Decimal("10"),
        predicted_demand=Decimal("0"),
        config=config,
    )
    assert risk.days_of_cover == Decimal("2.5")
    assert risk.risk_level == "medium"


@pytest.mark.django_db
def test_risk_level_critical_high_safe_boundaries(config):
    def risk_at(days_of_cover):
        return compute_stock_risk(
            phc_id=1,
            medicine_id=1,
            current_stock=days_of_cover,
            predicted_daily_consumption=Decimal("1"),
            predicted_demand=Decimal("0"),
            config=config,
        ).risk_level

    assert risk_at(Decimal("1")) == "critical"
    assert risk_at(Decimal("5")) == "high"
    assert risk_at(Decimal("10")) == "medium"
    assert risk_at(Decimal("100")) == "safe"

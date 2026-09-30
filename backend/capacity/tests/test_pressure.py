import pytest

from capacity.services import bed_pressure_level
from core.models import RiskConfig


@pytest.mark.django_db
def test_bed_pressure_level_uses_configured_thresholds_not_hardcoded():
    config = RiskConfig.objects.current()
    config.bed_pressure_medium_occupancy_pct = 10
    config.bed_pressure_high_occupancy_pct = 20
    config.bed_pressure_critical_occupancy_pct = 30
    config.save()

    # 15% occupancy is "safe" under defaults but "medium" under this config.
    assert bed_pressure_level(total_beds=100, occupied_beds=15) == "medium"


@pytest.mark.django_db
def test_bed_pressure_level_zero_beds_is_safe():
    assert bed_pressure_level(total_beds=0, occupied_beds=0) == "safe"

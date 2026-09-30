from capacity.models import BedCapacity
from core.models import RiskConfig


def latest_bed_capacity_by_phc(phcs) -> dict[int, dict]:
    """Each PHC's most recent {total_beds, occupied_beds} snapshot."""
    rows = (
        BedCapacity.objects.filter(phc__in=phcs)
        .order_by("phc_id", "-date")
        .distinct("phc_id")
    )
    return {
        row.phc_id: {"total_beds": row.total_beds, "occupied_beds": row.occupied_beds}
        for row in rows
    }


def bed_pressure_level(total_beds: int, occupied_beds: int) -> str:
    """
    Bed-occupancy pressure as one of the platform's fixed 4 risk levels,
    thresholds pulled from RiskConfig (CLAUDE.md: risk thresholds are never
    hard-coded).
    """
    if total_beds <= 0:
        return "safe"
    config = RiskConfig.objects.current()
    occupancy_pct = (occupied_beds / total_beds) * 100
    if occupancy_pct >= config.bed_pressure_critical_occupancy_pct:
        return "critical"
    if occupancy_pct >= config.bed_pressure_high_occupancy_pct:
        return "high"
    if occupancy_pct >= config.bed_pressure_medium_occupancy_pct:
        return "medium"
    return "safe"

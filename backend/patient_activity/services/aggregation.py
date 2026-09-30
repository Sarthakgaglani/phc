"""
Query-time aggregation (see ARCHITECTURE.md's district-aggregation decision
point) — fine through roughly 50 PHCs. Uses Postgres's DISTINCT ON, which is
acceptable since CLAUDE.md pins Postgres as the only supported database.
"""
from patient_activity.models import PatientFootfall


def latest_footfall_by_phc(phcs) -> dict[int, int]:
    """Each PHC's most recently recorded daily visit count."""
    rows = (
        PatientFootfall.objects.filter(phc__in=phcs)
        .order_by("phc_id", "-date")
        .distinct("phc_id")
    )
    return {row.phc_id: row.visit_count for row in rows}

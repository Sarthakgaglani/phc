from django.db.models import Count, Max, Q

from workforce.models import StaffAttendance, StaffMember


def staff_summary_by_phc(phcs) -> dict[int, dict]:
    """
    Each PHC's {staff_total, staff_present} — total is the active roster
    count, present is attendance on that PHC's own most-recently-recorded
    attendance date (PHCs don't all necessarily report on the same day).
    """
    phc_ids = [phc.pk if hasattr(phc, "pk") else phc for phc in phcs]

    totals = dict(
        StaffMember.objects.filter(phc_id__in=phc_ids, is_active=True)
        .values_list("phc_id")
        .annotate(total=Count("id"))
    )

    latest_dates = dict(
        StaffAttendance.objects.filter(staff_member__phc_id__in=phc_ids)
        .values("staff_member__phc_id")
        .annotate(latest=Max("date"))
        .values_list("staff_member__phc_id", "latest")
    )

    present_counts = {phc_id: 0 for phc_id in phc_ids}
    if latest_dates:
        query = Q()
        for phc_id, latest_date in latest_dates.items():
            query |= Q(staff_member__phc_id=phc_id, date=latest_date)
        rows = StaffAttendance.objects.filter(query, present=True).values_list(
            "staff_member__phc_id", flat=True
        )
        for phc_id in rows:
            present_counts[phc_id] = present_counts.get(phc_id, 0) + 1

    return {
        phc_id: {
            "staff_total": totals.get(phc_id, 0),
            "staff_present": present_counts.get(phc_id, 0),
        }
        for phc_id in phc_ids
    }

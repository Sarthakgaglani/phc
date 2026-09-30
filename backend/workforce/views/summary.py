from core.views import DistrictSummaryView
from workforce.serializers import StaffSummarySerializer
from workforce.services import staff_summary_by_phc


class StaffSummaryView(DistrictSummaryView):
    serializer_class = StaffSummarySerializer

    def build_rows(self, phcs):
        summary_by_phc = staff_summary_by_phc(phcs)
        return [
            {
                "phc": phc.id,
                "phc_name": phc.name,
                "staff_total": summary_by_phc.get(phc.id, {}).get("staff_total", 0),
                "staff_present": summary_by_phc.get(phc.id, {}).get("staff_present", 0),
            }
            for phc in phcs
        ]

from patient_activity.serializers import FootfallSummarySerializer
from patient_activity.services import latest_footfall_by_phc

from core.views.district_summary import DistrictSummaryView


class FootfallSummaryView(DistrictSummaryView):
    serializer_class = FootfallSummarySerializer

    def build_rows(self, phcs):
        footfall_by_phc = latest_footfall_by_phc(phcs)
        return [
            {
                "phc": phc.id,
                "phc_name": phc.name,
                "visit_count": footfall_by_phc.get(phc.id, 0),
            }
            for phc in phcs
        ]

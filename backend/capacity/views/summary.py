from core.views import DistrictSummaryView
from capacity.serializers import BedCapacitySummarySerializer
from capacity.services import bed_pressure_level, latest_bed_capacity_by_phc


class BedCapacitySummaryView(DistrictSummaryView):
    serializer_class = BedCapacitySummarySerializer

    def build_rows(self, phcs):
        beds_by_phc = latest_bed_capacity_by_phc(phcs)
        rows = []
        for phc in phcs:
            snapshot = beds_by_phc.get(phc.id, {"total_beds": 0, "occupied_beds": 0})
            rows.append(
                {
                    "phc": phc.id,
                    "phc_name": phc.name,
                    "total_beds": snapshot["total_beds"],
                    "occupied_beds": snapshot["occupied_beds"],
                    "pressure_level": bed_pressure_level(
                        snapshot["total_beds"], snapshot["occupied_beds"]
                    ),
                }
            )
        return rows

"""Simple lat/long distance — phase4.md: "a static distance table or simple
lat/long calculation is fine for MVP." PHCs without seeded coordinates just
have no computed distance rather than blocking matching on it."""
import math
from decimal import Decimal
from typing import Optional

EARTH_RADIUS_KM = 6371


def distance_km(phc_a, phc_b) -> Optional[Decimal]:
    if phc_a.latitude is None or phc_a.longitude is None:
        return None
    if phc_b.latitude is None or phc_b.longitude is None:
        return None

    lat1, lon1, lat2, lon2 = map(
        math.radians,
        (
            float(phc_a.latitude),
            float(phc_a.longitude),
            float(phc_b.latitude),
            float(phc_b.longitude),
        ),
    )
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    c = 2 * math.asin(math.sqrt(a))
    return Decimal(str(round(EARTH_RADIUS_KM * c, 2)))

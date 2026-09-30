"""
Generates clearly-synthetic sample data for local development: one state,
three districts, ten PHCs, one demo user per role (for the frontend's
dev-only role switcher), and the default RiskConfig row.

Every seeded name is fictional. Nothing here should ever be presented as
real government data (CLAUDE.md working convention #8) — re-running this
command is safe (idempotent via get_or_create) and never touches
non-synthetic rows.
"""
from django.core.management.base import BaseCommand
from django.db import transaction

import datetime

from accounts.models import User
from accounts.services.dev_login import DEMO_USERNAMES
from capacity.models import BedCapacity
from core.models import RiskConfig
from inventory.models import InventoryTransaction
from inventory.services import record_opening_balance
from locations.models import District, State
from medicines.models import Medicine
from patient_activity.models import PatientFootfall
from phcs.models import PHC
from workforce.models import StaffAttendance, StaffMember

DEMO_PASSWORD = "DemoPass123!"  # nosec: dev-only seeded account, not used in prod

DISTRICTS = {
    "Bareilly": [
        "Rampur PHC",
        "Sitapur PHC",
        "Kaimganj PHC",
        "Faridpur PHC",
        "Aonla PHC",
        "Nawabganj PHC",
    ],
    "Shahjahanpur": ["Tilhar PHC", "Jalalabad PHC"],
    "Pilibhit": ["Puranpur PHC", "Bisalpur PHC"],
}

# Approximate district-center coordinates, jittered per PHC below — good
# enough for Phase 4's donor-distance ranking demo; not surveyed locations.
DISTRICT_BASE_COORDS = {
    "Bareilly": (28.3670, 79.4304),
    "Shahjahanpur": (27.8829, 79.9111),
    "Pilibhit": (28.6314, 79.8050),
}

# name, unit, baseline opening-balance quantity for the first PHC
MEDICINES = [
    ("ORS packets", "packets", 200),
    ("Paracetamol 500mg", "tablets", 640),
    ("Amoxicillin 250mg", "tablets", 310),
    ("Iron folic acid", "tablets", 920),
]


class Command(BaseCommand):
    help = "Seed clearly-synthetic demo data: 1 state, 3 districts, 10 PHCs, demo users."

    @transaction.atomic
    def handle(self, *args, **options):
        RiskConfig.objects.current()
        self.stdout.write(self.style.SUCCESS("RiskConfig default row ensured."))

        state, _ = State.objects.get_or_create(
            code="UP-SYNTH", defaults={"name": "Uttar Pradesh (synthetic)"}
        )

        first_phc = None
        first_district = None
        all_phcs = []
        for i, (district_name, phc_names) in enumerate(DISTRICTS.items(), start=1):
            district, _ = District.objects.get_or_create(
                state=state,
                code=f"D{i}",
                defaults={"name": f"{district_name} (synthetic)"},
            )
            first_district = first_district or district
            base_lat, base_lon = DISTRICT_BASE_COORDS[district_name]
            for j, phc_name in enumerate(phc_names, start=1):
                # Small deterministic jitter (~0-15km) so PHCs within a
                # district aren't all stacked on one point.
                latitude = round(base_lat + (j * 0.03), 6)
                longitude = round(base_lon + (j * 0.04), 6)
                phc, _ = PHC.objects.get_or_create(
                    code=f"{district.code}-PHC{j}",
                    defaults={
                        "district": district,
                        "name": f"{phc_name} (synthetic)",
                        "address": "Synthetic seed data — not a real facility.",
                        "latitude": latitude,
                        "longitude": longitude,
                    },
                )
                if phc.latitude is None or phc.longitude is None:
                    phc.latitude = latitude
                    phc.longitude = longitude
                    phc.save(update_fields=["latitude", "longitude"])
                first_phc = first_phc or phc
                all_phcs.append(phc)
            self.stdout.write(
                self.style.SUCCESS(f"District '{district.name}': {len(phc_names)} PHCs seeded.")
            )

        demo_specs = {
            "PHC": {"phc": first_phc, "district": first_district, "state": state},
            "DISTRICT": {"district": first_district, "state": state},
            "STATE": {"state": state},
        }
        demo_users = {}
        for role, scope in demo_specs.items():
            username = DEMO_USERNAMES[role]
            user, created = User.objects.get_or_create(
                username=username,
                defaults={"role": role, **scope},
            )
            if created:
                user.set_password(DEMO_PASSWORD)
                user.save()
            demo_users[role] = user
            self.stdout.write(self.style.SUCCESS(f"Demo user '{username}' ({role}) ensured."))

        seed_recorder = demo_users["STATE"]
        for name, unit, base_qty in MEDICINES:
            medicine, _ = Medicine.objects.get_or_create(name=name, defaults={"unit": unit})
            for index, phc in enumerate(all_phcs):
                if InventoryTransaction.objects.filter(phc=phc, medicine=medicine).exists():
                    continue
                quantity = base_qty + (index * 37) % 200
                record_opening_balance(
                    phc=phc,
                    medicine=medicine,
                    quantity=quantity,
                    recorded_by=seed_recorder,
                    notes="Synthetic seed opening balance.",
                )
        self.stdout.write(
            self.style.SUCCESS(
                f"Opening balances seeded for {len(MEDICINES)} medicines "
                f"across {len(all_phcs)} PHCs."
            )
        )

        today = datetime.date.today()
        staff_roles = ["Medical Officer", "ANM", "Pharmacist"]
        for index, phc in enumerate(all_phcs):
            total_beds = 15 + (index * 3) % 20
            occupied_beds = min(total_beds, 4 + (index * 5) % total_beds)
            BedCapacity.objects.get_or_create(
                phc=phc,
                date=today,
                defaults={"total_beds": total_beds, "occupied_beds": occupied_beds},
            )
            PatientFootfall.objects.get_or_create(
                phc=phc, date=today, defaults={"visit_count": 40 + (index * 23) % 150}
            )
            for staff_index, role_title in enumerate(staff_roles):
                member, _ = StaffMember.objects.get_or_create(
                    phc=phc, name=f"{role_title} {index + 1}", defaults={"role_title": role_title}
                )
                is_present = (index + staff_index) % 4 != 0
                StaffAttendance.objects.get_or_create(
                    staff_member=member, date=today, defaults={"present": is_present}
                )
        self.stdout.write(
            self.style.SUCCESS(f"Beds/footfall/staffing seeded for {len(all_phcs)} PHCs.")
        )

        self.stdout.write(
            self.style.WARNING(
                "All seeded data is synthetic and for development only — "
                "never present it as real government data."
            )
        )

"""
Creates one new PHC — "Gonda Emergency PHC (synthetic)" — with critically
low medicine stock so it immediately shows up as a CRITICAL shortage and
becomes a transfer recipient after recompute_risk runs.

Strategy:
  - Opening balance is very small (5-15 units per medicine)
  - 30 days of back-filled CONSUMPTION records create a realistic daily
    consumption rate (~10-20 units/day per medicine)
  - This means Days of Cover = current_stock / daily_consumption < 3
    which is below the RiskConfig critical threshold (3.0 days)
  - recompute_risk will then generate alerts and a TransferRecommendation

Safe to re-run: get_or_create is used for the PHC and every ledger entry
is guarded by a date+PHC+medicine check so no duplicates are created.
"""
import datetime
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import User
from capacity.models import BedCapacity
from inventory.models import InventoryTransaction, TransactionType
from inventory.services import record_consumption, record_opening_balance
from locations.models import District, State
from medicines.models import Medicine
from patient_activity.models import PatientFootfall
from phcs.models import PHC
from workforce.models import StaffAttendance, StaffMember

# ── New PHC definition ────────────────────────────────────────────────────────
PHC_CODE = "D1-PHC-GONDA"
PHC_NAME = "Gonda Emergency PHC (synthetic)"
PHC_ADDRESS = "Synthetic critical-stock PHC — not a real facility."

# Place it in the same Bareilly district as the existing seeded PHCs
# (district code D1) — close enough for distance-based donor matching
# to pick a Bareilly donor.
# Coordinates: slightly north of Bareilly center so distance ranking works.
PHC_LATITUDE = 28.4950
PHC_LONGITUDE = 79.5200

# ── Medicine scenario ─────────────────────────────────────────────────────────
# opening_qty: tiny — will be exhausted in < 3 days at the consumption rate
# daily_consumption: realistic daily draw used to back-fill 30 days of data
MEDICINE_SCENARIOS = [
    # (medicine_name,          opening_qty, daily_consumption)
    ("ORS packets",            8,           15),   # 8 / 15 = 0.53 days → CRITICAL
    ("Paracetamol 500mg",      12,          20),   # 12 / 20 = 0.60 days → CRITICAL
    ("Amoxicillin 250mg",      5,           10),   # 5  / 10 = 0.50 days → CRITICAL
    ("Iron folic acid",        10,          18),   # 10 / 18 = 0.55 days → CRITICAL
]

# 30 days of back-filled consumption so the forecast engine has a signal
CONSUMPTION_BACKFILL_DAYS = 30


class Command(BaseCommand):
    help = (
        "Add a synthetic critical-shortage PHC (Gonda Emergency PHC) to the DB. "
        "Run recompute_risk afterwards to generate alerts and transfer recommendations."
    )

    @transaction.atomic
    def handle(self, *args, **options):
        # ── 1. Resolve the Bareilly district (seeded by seed_data) ───────────
        try:
            state = State.objects.get(code="UP-SYNTH")
        except State.DoesNotExist:
            self.stderr.write(
                self.style.ERROR(
                    "State 'UP-SYNTH' not found — run seed_data first:\n"
                    "  python manage.py seed_data"
                )
            )
            return

        try:
            district = District.objects.get(state=state, code="D1")
        except District.DoesNotExist:
            self.stderr.write(
                self.style.ERROR(
                    "District D1 (Bareilly) not found — run seed_data first."
                )
            )
            return

        # ── 2. Create (or retrieve) the PHC ──────────────────────────────────
        phc, phc_created = PHC.objects.get_or_create(
            code=PHC_CODE,
            defaults={
                "district": district,
                "name": PHC_NAME,
                "address": PHC_ADDRESS,
                "latitude": PHC_LATITUDE,
                "longitude": PHC_LONGITUDE,
                "is_active": True,
            },
        )
        if phc_created:
            self.stdout.write(self.style.SUCCESS(f"✓ Created PHC: {phc.name} (code={PHC_CODE})"))
        else:
            self.stdout.write(self.style.WARNING(f"↺ PHC already exists: {phc.name} — skipping duplicate records."))

        # ── 3. Resolve a recorder user (use demo_state if available) ─────────
        recorder = (
            User.objects.filter(username="demo_state").first()
            or User.objects.filter(is_superuser=True).first()
            or User.objects.first()
        )
        if recorder is None:
            self.stderr.write(
                self.style.ERROR("No users found — run seed_data first.")
            )
            return

        # ── 4. Seed opening balances + consumption history ────────────────────
        today = datetime.date.today()
        medicines_processed = 0

        for medicine_name, opening_qty, daily_qty in MEDICINE_SCENARIOS:
            try:
                medicine = Medicine.objects.get(name=medicine_name)
            except Medicine.DoesNotExist:
                self.stderr.write(
                    self.style.WARNING(f"  Medicine '{medicine_name}' not found — skipping.")
                )
                continue

            # Opening balance — only if none exists yet for this PHC/medicine
            has_opening = InventoryTransaction.objects.filter(
                phc=phc,
                medicine=medicine,
                transaction_type=TransactionType.OPENING_BALANCE,
            ).exists()

            if not has_opening:
                # Back-date the opening balance to the start of the window so
                # the current_stock() SUM is correct: opening_qty is what
                # remains TODAY after 30 days of consumption already happened.
                # We record the opening balance as a large historical quantity
                # (opening_qty + daily_qty * BACKFILL_DAYS) and then let the
                # consumption records draw it down to opening_qty.
                historical_qty = opening_qty + daily_qty * CONSUMPTION_BACKFILL_DAYS
                opening_date = today - datetime.timedelta(days=CONSUMPTION_BACKFILL_DAYS + 1)
                record_opening_balance(
                    phc=phc,
                    medicine=medicine,
                    quantity=historical_qty,
                    recorded_by=recorder,
                    transaction_date=opening_date,
                    notes=f"Synthetic critical-stock opening balance for {PHC_NAME}.",
                )
                self.stdout.write(
                    f"  {medicine_name}: opening balance {historical_qty} units "
                    f"on {opening_date}"
                )

            # Back-fill 30 days of consumption — skip any day that already has
            # a consumption record to stay idempotent.
            days_added = 0
            for day_offset in range(CONSUMPTION_BACKFILL_DAYS, 0, -1):
                consumption_date = today - datetime.timedelta(days=day_offset)
                already_exists = InventoryTransaction.objects.filter(
                    phc=phc,
                    medicine=medicine,
                    transaction_type=TransactionType.CONSUMPTION,
                    transaction_date=consumption_date,
                ).exists()
                if not already_exists:
                    # Small ±2 unit variation to make it look realistic
                    variation = (day_offset % 5) - 2          # -2 to +2
                    qty = max(1, daily_qty + variation)
                    record_consumption(
                        phc=phc,
                        medicine=medicine,
                        quantity=qty,
                        recorded_by=recorder,
                        transaction_date=consumption_date,
                        notes="Synthetic back-filled consumption for critical PHC.",
                    )
                    days_added += 1

            self.stdout.write(
                self.style.SUCCESS(
                    f"  ✓ {medicine_name}: "
                    f"current stock ≈ {opening_qty} units, "
                    f"~{daily_qty} units/day consumption "
                    f"→ Days of Cover ≈ {opening_qty / daily_qty:.1f} (CRITICAL)"
                    + (f", {days_added} consumption records added" if days_added else " (consumption already seeded)")
                )
            )
            medicines_processed += 1

        # ── 5. Seed operational signals for today ────────────────────────────
        BedCapacity.objects.get_or_create(
            phc=phc,
            date=today,
            defaults={
                "total_beds": 20,
                "occupied_beds": 18,   # High occupancy — adds to urgency
            },
        )
        PatientFootfall.objects.get_or_create(
            phc=phc,
            date=today,
            defaults={"visit_count": 95},  # High footfall
        )
        staff_roles = ["Medical Officer", "ANM", "Pharmacist"]
        for role_title in staff_roles:
            member, _ = StaffMember.objects.get_or_create(
                phc=phc,
                name=f"{role_title} Gonda",
                defaults={"role_title": role_title},
            )
            StaffAttendance.objects.get_or_create(
                staff_member=member,
                date=today,
                defaults={"present": True},
            )

        self.stdout.write(self.style.SUCCESS("  ✓ Beds / footfall / staff seeded."))

        # ── 6. Summary ───────────────────────────────────────────────────────
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("=" * 60))
        self.stdout.write(
            self.style.SUCCESS(
                f"Gonda Emergency PHC created with {medicines_processed} medicines "
                "at critically low stock levels."
            )
        )
        self.stdout.write("")
        self.stdout.write(
            "Next step — run the risk pipeline to generate alerts and "
            "transfer recommendations:"
        )
        self.stdout.write(self.style.WARNING("  python manage.py recompute_risk"))
        self.stdout.write(self.style.SUCCESS("=" * 60))

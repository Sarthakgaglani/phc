"""
Phase 6 load test (phase6.md): the three paths it names — district/state
aggregation queries, forecast recomputation across all PHCs/medicines, and
Channels fan-out — measured at MVP scale (20-50 PHCs). Seeds its own
throwaway data (clearly synthetic, prefixed so it never collides with
`seed_data`'s fixtures) rather than requiring a specific existing dataset,
so this is safe to run repeatedly against a dev database.
"""
import datetime
import time

from django.core.management.base import BaseCommand
from django.db import connection, reset_queries
from django.test.utils import override_settings

from accounts.models import Role, User
from alerts.models import Alert
from alerts.services import sync_alerts_for
from analytics.services import evaluate_due_followups
from core.realtime import broadcast
from forecasting.services import forecast as compute_forecast
from forecasting.services import get_current_stock_risk
from inventory.models import InventoryTransaction
from inventory.services import record_consumption, record_receipt
from locations.models import District, State
from medicines.models import Medicine
from phcs.models import PHC
from transfers.models import TransferRecommendation, TransferRequest

PHC_COUNT = 50
MEDICINE_COUNT = 4
CONSUMPTION_DAYS = 30


class Command(BaseCommand):
    help = "Load-test district/state aggregation, forecast recompute, and Channels fan-out."

    def add_arguments(self, parser):
        parser.add_argument("--phcs", type=int, default=PHC_COUNT)

    def handle(self, *args, **options):
        phc_count = options["phcs"]
        state, district, phcs, medicines, user = self._seed(phc_count)

        self._time_forecast_recompute(phcs, medicines)
        self._time_district_aggregation(district)
        self._time_state_aggregation(state)
        self._time_channels_fanout(phcs)

    def _seed(self, phc_count):
        state, _ = State.objects.get_or_create(
            code="LOADTEST", defaults={"name": "Load Test State"}
        )
        district, _ = District.objects.get_or_create(
            state=state, code="LT-D1", defaults={"name": "Load Test District"}
        )
        user, _ = User.objects.get_or_create(
            username="loadtest_seed", defaults={"role": Role.STATE, "state": state}
        )

        phcs = []
        for i in range(phc_count):
            phc, _ = PHC.objects.get_or_create(
                code=f"LT-PHC-{i}",
                defaults={"district": district, "name": f"Load Test PHC {i}"},
            )
            phcs.append(phc)

        medicines = []
        for i in range(MEDICINE_COUNT):
            medicine, _ = Medicine.objects.get_or_create(
                name=f"Load Test Medicine {i}", defaults={"unit": "units"}
            )
            medicines.append(medicine)

        today = datetime.date.today()
        old = today - datetime.timedelta(days=CONSUMPTION_DAYS + 10)
        for phc in phcs:
            for medicine in medicines:
                if InventoryTransaction.objects.filter(phc=phc, medicine=medicine).exists():
                    continue
                record_receipt(phc, medicine, 500, user, transaction_date=old)
                for offset in range(1, CONSUMPTION_DAYS + 1):
                    record_consumption(
                        phc, medicine, 10, user,
                        transaction_date=today - datetime.timedelta(days=offset),
                    )

        self.stdout.write(
            self.style.SUCCESS(f"Seeded {len(phcs)} PHCs x {len(medicines)} medicines.")
        )
        return state, district, phcs, medicines, user

    def _time_forecast_recompute(self, phcs, medicines):
        start = time.perf_counter()
        for phc in phcs:
            for medicine in medicines:
                compute_forecast(phc, medicine)
                risk = get_current_stock_risk(phc, medicine)
                sync_alerts_for(phc, medicine, risk)
        elapsed = time.perf_counter() - start
        pairs = len(phcs) * len(medicines)
        self.stdout.write(
            self.style.SUCCESS(
                f"Forecast/risk/alert recompute: {pairs} PHC/medicine pairs in {elapsed:.2f}s "
                f"({elapsed / pairs * 1000:.1f}ms/pair)."
            )
        )

    def _time_district_aggregation(self, district):
        with override_settings(DEBUG=True):
            reset_queries()
            start = time.perf_counter()
            phcs = list(PHC.objects.filter(district=district))
            list(Alert.objects.filter(phc__district=district, is_active=True))
            list(TransferRecommendation.objects.filter(recipient_phc__district=district))
            list(TransferRequest.objects.filter(recipient_phc__district=district))
            elapsed = time.perf_counter() - start
            query_count = len(connection.queries)
        self.stdout.write(
            self.style.SUCCESS(
                f"District aggregation ({len(phcs)} PHCs): {elapsed * 1000:.1f}ms, "
                f"{query_count} queries."
            )
        )

    def _time_state_aggregation(self, state):
        with override_settings(DEBUG=True):
            reset_queries()
            start = time.perf_counter()
            phcs = list(PHC.objects.filter(district__state=state))
            list(Alert.objects.filter(phc__district__state=state, is_active=True))
            list(TransferRecommendation.objects.filter(recipient_phc__district__state=state))
            list(TransferRequest.objects.filter(recipient_phc__district__state=state))
            elapsed = time.perf_counter() - start
            query_count = len(connection.queries)
        self.stdout.write(
            self.style.SUCCESS(
                f"State aggregation ({len(phcs)} PHCs): {elapsed * 1000:.1f}ms, "
                f"{query_count} queries."
            )
        )

    def _time_channels_fanout(self, phcs):
        start = time.perf_counter()
        for phc in phcs:
            broadcast("load_test.event", {"phc": phc.id}, phcs=[phc])
        elapsed = time.perf_counter() - start
        self.stdout.write(
            self.style.SUCCESS(
                f"Channels fan-out: {len(phcs)} broadcast() calls in {elapsed * 1000:.1f}ms "
                f"({elapsed / len(phcs) * 1000:.2f}ms/call, Redis publish only — "
                "cost of delivering to N connected clients per group is a separate, "
                "unmeasured dimension; see notes."
            )
        )
        evaluate_due_followups()  # exercise the other periodic task path too

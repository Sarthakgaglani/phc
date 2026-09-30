"""
Synchronous equivalent of forecasting.tasks.recompute_forecast_and_risk /
recompute_all — for local dev/demo use when no Celery worker is running, and
for seeding forecast history right after `seed_data`. The real periodic path
is the Celery beat schedule in config/celery.py; this command calls the same
plain service functions the tasks wrap, including Phase 4's donor-matching
trigger on shortage, so dev/demo behavior doesn't drift from production.
"""
from django.core.management.base import BaseCommand

from alerts.services import sync_alerts_for
from forecasting.services import forecast, get_current_stock_risk
from medicines.models import Medicine
from phcs.models import PHC
from transfers.services import build_recommendation
from transfers.services.state_machine import create_requests_for_recommendation


class Command(BaseCommand):
    help = "Recompute forecasts, stock risk, alerts, and shortage recommendations for every PHC."

    def handle(self, *args, **options):
        phcs = list(PHC.objects.filter(is_active=True))
        medicines = list(Medicine.objects.filter(is_active=True))
        count = 0
        recommendation_count = 0
        for phc in phcs:
            for medicine in medicines:
                forecast(phc, medicine)
                risk = get_current_stock_risk(phc, medicine)
                sync_alerts_for(phc, medicine, risk)
                if risk.shortage > 0:
                    recommendation = build_recommendation(phc, medicine)
                    if recommendation is not None:
                        recommendation_count += 1
                        create_requests_for_recommendation(recommendation)
                count += 1
        self.stdout.write(
            self.style.SUCCESS(
                f"Recomputed forecast/risk/alerts for {count} PHC/medicine pairs "
                f"({recommendation_count} recommendations generated)."
            )
        )

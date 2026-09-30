"""
Celery task per shortage event (phase4.md) — triggered from
forecasting.tasks.recompute_forecast_and_risk once it sees a shortage,
never run synchronously inside a request/response cycle.
"""
from celery import shared_task

from medicines.models import Medicine
from phcs.models import PHC
from transfers.services import build_recommendation
from transfers.services.state_machine import create_requests_for_recommendation


@shared_task(name="transfers.tasks.generate_recommendation_for_shortage")
def generate_recommendation_for_shortage(phc_id: int, medicine_id: int):
    phc = PHC.objects.get(pk=phc_id)
    medicine = Medicine.objects.get(pk=medicine_id)
    recommendation = build_recommendation(phc, medicine)
    if recommendation is not None:
        create_requests_for_recommendation(recommendation)

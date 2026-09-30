"""
Celery tasks — thin wrappers around plain service functions (tests call the
service functions directly, never through .delay(), so the suite doesn't
need a running broker). `recompute_all` fans out one independent task per
(phc, medicine) pair rather than looping inside a single task, so it scales
roughly linearly with PHC count and can be parallelized across workers
(phase3.md scalability requirement).
"""
from celery import shared_task

from alerts.services import sync_alerts_for
from forecasting.services import forecast, get_current_stock_risk
from medicines.models import Medicine
from phcs.models import PHC
from transfers.tasks import generate_recommendation_for_shortage


@shared_task(name="forecasting.tasks.recompute_forecast_and_risk")
def recompute_forecast_and_risk(phc_id: int, medicine_id: int):
    phc = PHC.objects.get(pk=phc_id)
    medicine = Medicine.objects.get(pk=medicine_id)
    forecast(phc, medicine)
    risk = get_current_stock_risk(phc, medicine)
    sync_alerts_for(phc, medicine, risk)
    if risk.shortage > 0:
        generate_recommendation_for_shortage.delay(phc_id, medicine_id)


@shared_task(name="forecasting.tasks.recompute_all")
def recompute_all():
    medicine_ids = list(Medicine.objects.filter(is_active=True).values_list("id", flat=True))
    for phc_id in PHC.objects.filter(is_active=True).values_list("id", flat=True):
        for medicine_id in medicine_ids:
            recompute_forecast_and_risk.delay(phc_id, medicine_id)

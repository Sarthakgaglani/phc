import os

from celery import Celery
from celery.schedules import crontab

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "projecth.settings")

app = Celery("projecth")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

# Static schedule (no django-celery-beat) — avoids an extra dependency for
# a schedule that, for now, never needs runtime editing.
app.conf.beat_schedule = {
    "recompute-forecasts-risk-alerts-hourly": {
        "task": "forecasting.tasks.recompute_all",
        "schedule": crontab(minute=0),
    },
    "evaluate-due-outcome-followups-daily": {
        "task": "analytics.tasks.evaluate_due_outcome_followups",
        "schedule": crontab(hour=1, minute=0),
    },
}

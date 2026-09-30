from celery import shared_task

from analytics.services import evaluate_due_followups


@shared_task(name="analytics.tasks.evaluate_due_outcome_followups")
def evaluate_due_outcome_followups():
    return evaluate_due_followups()

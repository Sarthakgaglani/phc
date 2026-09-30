from django.contrib import admin

from analytics.models import TransferOutcome


@admin.register(TransferOutcome)
class TransferOutcomeAdmin(admin.ModelAdmin):
    list_display = (
        "transfer_request", "shortage_before", "shortage_after_receipt",
        "followup_due_at", "shortage_averted",
    )
    list_filter = ("shortage_averted",)

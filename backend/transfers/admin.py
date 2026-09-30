from django.contrib import admin

from transfers.models import (
    TransferApproval,
    TransferDispatch,
    TransferReceipt,
    TransferRecommendation,
    TransferRecommendationAllocation,
    TransferRequest,
)


class AllocationInline(admin.TabularInline):
    model = TransferRecommendationAllocation
    extra = 0


@admin.register(TransferRecommendation)
class TransferRecommendationAdmin(admin.ModelAdmin):
    list_display = (
        "recipient_phc", "medicine", "recipient_shortage", "unresolved_shortage", "is_superseded",
    )
    list_filter = ("is_superseded", "recipient_phc__district__state", "recipient_phc__district")
    inlines = [AllocationInline]


@admin.register(TransferRequest)
class TransferRequestAdmin(admin.ModelAdmin):
    list_display = ("donor_phc", "recipient_phc", "medicine", "quantity", "status", "version")
    list_filter = ("status", "donor_phc__district__state")


admin.site.register(TransferApproval)
admin.site.register(TransferDispatch)
admin.site.register(TransferReceipt)

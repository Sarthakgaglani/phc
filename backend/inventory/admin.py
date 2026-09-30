from django.contrib import admin

from inventory.models import InventoryTransaction


@admin.register(InventoryTransaction)
class InventoryTransactionAdmin(admin.ModelAdmin):
    """
    Read-mostly in admin too: the ledger is append-only, so change/delete
    are disabled here the same way they're disabled everywhere else —
    correcting a mistake means recording an ADJUSTMENT row, not editing
    history.
    """

    list_display = (
        "transaction_date",
        "phc",
        "medicine",
        "transaction_type",
        "quantity",
        "recorded_by",
    )
    list_filter = ("transaction_type", "phc__district__state", "phc__district")
    search_fields = ("phc__name", "medicine__name")
    date_hierarchy = "transaction_date"

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

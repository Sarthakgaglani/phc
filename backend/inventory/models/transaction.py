from django.core.exceptions import ValidationError
from django.db import models

from core.models import TimeStampedModel
from core.rbac import role_scoped_manager


class TransactionType(models.TextChoices):
    OPENING_BALANCE = "OPENING_BALANCE", "Opening balance"
    RECEIPT = "RECEIPT", "Receipt"
    CONSUMPTION = "CONSUMPTION", "Consumption"
    TRANSFER_OUT = "TRANSFER_OUT", "Transfer out"
    TRANSFER_IN = "TRANSFER_IN", "Transfer in"
    ADJUSTMENT = "ADJUSTMENT", "Adjustment"
    EXPIRY = "EXPIRY", "Expiry"
    DAMAGE = "DAMAGE", "Damage"


# Transaction types whose quantity must be recorded as positive (stock in)
# vs. negative (stock out). ADJUSTMENT is the one type allowed to go either
# way, for correcting miscounts. Enforced in InventoryTransaction.clean() so
# no code path can silently record stock moving the wrong direction.
POSITIVE_TYPES = {
    TransactionType.OPENING_BALANCE,
    TransactionType.RECEIPT,
    TransactionType.TRANSFER_IN,
}
NEGATIVE_TYPES = {
    TransactionType.CONSUMPTION,
    TransactionType.TRANSFER_OUT,
    TransactionType.EXPIRY,
    TransactionType.DAMAGE,
}


class InventoryTransaction(TimeStampedModel):
    """
    The append-only stock ledger (CLAUDE.md non-negotiable rule #4).
    Current stock is never stored — it is always
    `sum(quantity)` over a PHC+medicine's rows, computed by
    `inventory.services.stock.current_stock()`. Nothing should write to a
    "current stock" field anywhere because no such field exists.

    `quantity` is signed: positive for stock moving in, negative for stock
    moving out. Callers should go through `inventory.services.movements`
    rather than constructing rows directly, so the sign convention lives in
    one place.
    """

    phc = models.ForeignKey(
        "phcs.PHC", on_delete=models.PROTECT, related_name="inventory_transactions"
    )
    medicine = models.ForeignKey(
        "medicines.Medicine", on_delete=models.PROTECT, related_name="inventory_transactions"
    )
    transaction_type = models.CharField(max_length=20, choices=TransactionType.choices)
    quantity = models.IntegerField()
    transaction_date = models.DateField(
        help_text="When the movement happened, not when it was entered."
    )
    recorded_by = models.ForeignKey(
        "accounts.User", on_delete=models.PROTECT, related_name="recorded_transactions"
    )
    notes = models.CharField(max_length=255, blank=True)

    objects = role_scoped_manager(
        state_id_lookup="phc__district__state_id",
        district_id_lookup="phc__district_id",
        phc_id_lookup="phc_id",
    )

    class Meta:
        ordering = ["-transaction_date", "-created_at"]
        indexes = [
            models.Index(fields=["phc", "medicine", "transaction_date"]),
        ]

    def __str__(self):
        return f"{self.phc} / {self.medicine} / {self.transaction_type} / {self.quantity}"

    def clean(self):
        if self.transaction_type in POSITIVE_TYPES and self.quantity <= 0:
            raise ValidationError(f"{self.transaction_type} must have a positive quantity.")
        if self.transaction_type in NEGATIVE_TYPES and self.quantity >= 0:
            raise ValidationError(f"{self.transaction_type} must have a negative quantity.")
        if self.transaction_type == TransactionType.ADJUSTMENT and self.quantity == 0:
            raise ValidationError("An adjustment must be non-zero.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

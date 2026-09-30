"""
The only sanctioned way to write stock movements. Each function owns the
sign convention for its transaction type so callers (views, the seed
command, the future transfer-receipt flow in Phase 5) always pass a plain
positive quantity and never have to know the ledger stores signed values.
"""
from datetime import date

from django.db import transaction

from inventory.models import InventoryTransaction, TransactionType


def _record(phc, medicine, transaction_type, signed_quantity, recorded_by, transaction_date, notes):
    with transaction.atomic():
        return InventoryTransaction.objects.create(
            phc=phc,
            medicine=medicine,
            transaction_type=transaction_type,
            quantity=signed_quantity,
            transaction_date=transaction_date or date.today(),
            recorded_by=recorded_by,
            notes=notes,
        )


def record_opening_balance(phc, medicine, quantity, recorded_by, transaction_date=None, notes=""):
    return _record(
        phc, medicine, TransactionType.OPENING_BALANCE, quantity,
        recorded_by, transaction_date, notes,
    )


def record_receipt(phc, medicine, quantity, recorded_by, transaction_date=None, notes=""):
    return _record(
        phc, medicine, TransactionType.RECEIPT, quantity, recorded_by, transaction_date, notes
    )


def record_consumption(phc, medicine, quantity, recorded_by, transaction_date=None, notes=""):
    return _record(
        phc, medicine, TransactionType.CONSUMPTION, -quantity, recorded_by, transaction_date, notes
    )


def record_adjustment(phc, medicine, signed_delta, recorded_by, transaction_date=None, notes=""):
    """`signed_delta` may be positive (found extra stock) or negative (miscount correction)."""
    return _record(
        phc, medicine, TransactionType.ADJUSTMENT, signed_delta,
        recorded_by, transaction_date, notes,
    )


def record_expiry(phc, medicine, quantity, recorded_by, transaction_date=None, notes=""):
    return _record(
        phc, medicine, TransactionType.EXPIRY, -quantity, recorded_by, transaction_date, notes
    )


def record_damage(phc, medicine, quantity, recorded_by, transaction_date=None, notes=""):
    return _record(
        phc, medicine, TransactionType.DAMAGE, -quantity, recorded_by, transaction_date, notes
    )


def record_transfer_out(phc, medicine, quantity, recorded_by, transaction_date=None, notes=""):
    """
    Written only by transfers.services.state_machine.receive() (CLAUDE.md:
    "the one place the system itself writes to the ledger rather than
    manual entry") — never called directly from a view.
    """
    return _record(
        phc, medicine, TransactionType.TRANSFER_OUT, -quantity, recorded_by, transaction_date, notes
    )


def record_transfer_in(phc, medicine, quantity, recorded_by, transaction_date=None, notes=""):
    """Written only by transfers.services.state_machine.receive(), alongside
    record_transfer_out() in the same atomic transaction."""
    return _record(
        phc, medicine, TransactionType.TRANSFER_IN, quantity, recorded_by, transaction_date, notes
    )

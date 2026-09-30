class TransferConflict(Exception):
    """
    Raised when a state-transition's optimistic-locking guard
    (`UPDATE ... WHERE id=X AND version=Y AND status=Z`) matches zero rows —
    either someone else's concurrent transition won the race, or the
    request is simply not in the expected status anymore. Views translate
    this to HTTP 409 so the client knows to re-fetch and retry deliberately
    rather than treating it as a generic 400/500.
    """

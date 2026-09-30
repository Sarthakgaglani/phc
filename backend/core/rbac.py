"""
RBAC at the queryset layer (CLAUDE.md: "RBAC at the queryset layer, not the
view layer"). Every model that should be scoped by role/location gets a
manager built by `role_scoped_manager(...)`, declaring three lookup paths
from itself to the state/district/phc that owns each row. Views then call
`Model.objects.for_user(request.user)` instead of `Model.objects.all()` —
that one substitution is the whole RBAC enforcement point, reused by every
future app rather than reimplemented per view.
"""
from django.db import models


class RoleScopedQuerySet(models.QuerySet):
    # Overridden per-model via role_scoped_manager(); defaults assume a
    # direct `phc` FK, the common case for operational models.
    state_id_lookup = "phc__district__state_id"
    district_id_lookup = "phc__district_id"
    phc_id_lookup = "phc_id"

    def for_user(self, user):
        """Scope this queryset to what `user` is allowed to see.

        PHC users see only their own PHC's rows, district users see every
        row under their district, state users see everything in-state.
        Superusers (ops/admin) are unrestricted.
        """
        if user is None or not getattr(user, "is_authenticated", False):
            return self.none()
        if user.is_superuser:
            return self

        # Local import to avoid a circular import between core and accounts.
        from accounts.models import Role

        if user.role == Role.NATIONAL:
            return self
        if user.role == Role.STATE:
            return self.filter(**{self.state_id_lookup: user.state_id})
        if user.role == Role.DISTRICT:
            return self.filter(**{self.district_id_lookup: user.district_id})
        if user.role == Role.PHC:
            return self.filter(**{self.phc_id_lookup: user.phc_id})
        return self.none()


def role_scoped_manager(
    state_id_lookup="phc__district__state_id",
    district_id_lookup="phc__district_id",
    phc_id_lookup="phc_id",
):
    """Build a Manager whose querysets support `.for_user(user)`.

    Pass the field-lookup path (Django's `__` syntax) from this model to
    the state/district/phc id that should gate access to a row. The
    defaults fit any model with a direct `phc` FK; PHC/District/State
    themselves pass their own paths (see phcs/locations models).
    """
    queryset_class = type(
        "ScopedQuerySet",
        (RoleScopedQuerySet,),
        {
            "state_id_lookup": state_id_lookup,
            "district_id_lookup": district_id_lookup,
            "phc_id_lookup": phc_id_lookup,
        },
    )
    return queryset_class.as_manager()

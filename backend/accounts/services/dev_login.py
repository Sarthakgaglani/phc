"""
Backing service for the dev-only role switcher (phase0.md: "a dev-only role
switcher for testing"). Never used outside DEBUG — the view enforces that,
this module just knows which seeded username stands in for each role so the
mapping lives in one place instead of duplicated in the view and the seed
command.
"""
from django.contrib.auth import get_user_model

DEMO_USERNAMES = {
    "PHC": "demo_phc",
    "DISTRICT": "demo_district",
    "STATE": "demo_state",
}


def get_demo_user(role: str):
    username = DEMO_USERNAMES.get(role)
    if not username:
        return None
    User = get_user_model()
    return User.objects.filter(username=username).first()

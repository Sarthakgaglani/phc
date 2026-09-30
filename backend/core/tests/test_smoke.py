"""CI smoke test: the app boots, migrations are consistent, and the admin
login page (a real view exercising settings/urls/templates together)
renders. This is deliberately not testing domain logic — that's covered
per-app — just that the project wires together at all.
"""
import pytest
from django.core.management import call_command
from django.test import Client


@pytest.mark.django_db
def test_no_missing_migrations():
    call_command("makemigrations", "--check", "--dry-run")


@pytest.mark.django_db
def test_admin_login_page_renders():
    response = Client().get("/admin/login/")
    assert response.status_code == 200

import pytest
from django.core.management import call_command
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.businesses.models import BusinessProfile
from apps.catalog.models import CatalogItem

HOURS = [{"day": d, "open": "08:00", "close": "17:00", "closed": d == "Sunday"} for d in
         ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]]
PASSWORD = "S0me-Strong-Pass!"


@pytest.fixture(scope="session")
def django_db_setup(django_db_setup, django_db_blocker):
    """The shared (database) cache that backs rate limiting needs its table in the test database too."""
    with django_db_blocker.unblock():
        call_command("createcachetable")


@pytest.fixture(autouse=True)
def _clear_throttle_cache(db):
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def anon():
    return APIClient()


def make_user(email="owner@example.com", name="Test Owner", role="OWNER"):
    return User.objects.create_user(email=email, password=PASSWORD, name=name, role=role)


def client_for(user):
    c = APIClient()
    c.force_login(user)
    return c


def make_business(owner, name="Test Fish", status="PUBLISHED", **kw):
    from apps.businesses.services import unique_slug
    defaults = dict(owner=owner, name=name, category="FISH_SEAFOOD", description="Fresh fish every morning.", county="Mombasa",
                    town="Nyali", phone="0700 111 222", email="private@example.com", show_phone=True, show_email=False,
                    hours=HOURS, status=status, slug=unique_slug(name))
    defaults.update(kw)
    return BusinessProfile.objects.create(**defaults)


def make_item(business, name="Tilapia", price="450.00", **kw):
    return CatalogItem.objects.create(business=business, name=name, price=price, category="Fish", **kw)


@pytest.fixture
def owner(db):
    return make_user()


@pytest.fixture
def other(db):
    return make_user("other@example.com", "Other Owner")


@pytest.fixture
def owner_client(owner):
    return client_for(owner)


@pytest.fixture
def other_client(other):
    return client_for(other)


@pytest.fixture
def admin_user(db):
    return make_user("admin@example.com", "Admin", role="ADMIN")


@pytest.fixture
def biz(owner):
    return make_business(owner)


BIZ_PAYLOAD = {
    "name": "Asha's Fish", "category": "FISH_SEAFOOD", "description": "Fresh fish every morning.", "county": "Mombasa", "town": "Nyali",
    "publicAddress": "", "phone": "0700 555 666", "whatsapp": "", "email": "", "showPhone": True, "showEmail": False,
    "hours": HOURS, "showPrices": True,
}

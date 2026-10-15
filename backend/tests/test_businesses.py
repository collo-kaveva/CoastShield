import pytest

from apps.audit.models import AuditEvent
from apps.businesses.models import BusinessProfile

from .conftest import BIZ_PAYLOAD, client_for, make_business, make_item, make_user

pytestmark = pytest.mark.django_db


def test_owner_creates_and_edits_own_business(owner_client):
    assert owner_client.get("/api/v1/business/me/").status_code == 404
    r = owner_client.put("/api/v1/business/me/", BIZ_PAYLOAD, format="json")
    assert r.status_code == 201
    b = r.json()
    assert b["status"] == "DRAFT" and b["slug"] == "ashas-fish" and b["isSample"] is False
    r2 = owner_client.put("/api/v1/business/me/", {**BIZ_PAYLOAD, "name": "Renamed Fish"}, format="json")
    assert r2.status_code == 200 and r2.json()["name"] == "Renamed Fish"
    assert r2.json()["slug"] == "ashas-fish"  # stable public URL after rename
    assert BusinessProfile.objects.count() == 1


def test_cannot_set_slug_status_owner_or_sample_flag(owner_client, other):
    r = owner_client.put("/api/v1/business/me/", {**BIZ_PAYLOAD, "slug": "hacked", "status": "PUBLISHED", "ownerId": str(other.id), "isSample": True}, format="json")
    b = r.json()
    assert b["slug"] != "hacked" and b["status"] == "DRAFT" and b["ownerId"] != str(other.id) and b["isSample"] is False


def test_business_validation(owner_client):
    bad = {**BIZ_PAYLOAD, "name": "x", "category": "NOPE", "phone": "abc", "email": "nope", "hours": [{"day": "Monday"}]}
    r = owner_client.put("/api/v1/business/me/", bad, format="json")
    assert r.status_code == 422
    assert {"name", "category", "phone", "email", "hours"} <= set(r.json()["error"]["fields"])


def test_slugs_are_unique(owner_client, other_client):
    a = owner_client.put("/api/v1/business/me/", BIZ_PAYLOAD, format="json").json()["slug"]
    b = other_client.put("/api/v1/business/me/", BIZ_PAYLOAD, format="json").json()["slug"]
    assert a != b and b.startswith(a)


def test_publish_requires_complete_profile_and_audits(owner_client):
    owner_client.put("/api/v1/business/me/", {**BIZ_PAYLOAD, "description": "", "phone": ""}, format="json")
    r = owner_client.post("/api/v1/business/me/publish/")
    assert r.status_code == 422 and "description" in r.json()["error"]["message"] and "contact" in r.json()["error"]["message"]
    owner_client.put("/api/v1/business/me/", BIZ_PAYLOAD, format="json")
    assert owner_client.post("/api/v1/business/me/publish/").json()["status"] == "PUBLISHED"
    assert owner_client.post("/api/v1/business/me/unpublish/").json()["status"] == "DRAFT"
    assert list(AuditEvent.objects.filter(action__startswith="BUSINESS_").values_list("action", flat=True).order_by("created_at")) == ["BUSINESS_PUBLISHED", "BUSINESS_UNPUBLISHED"]


def test_owner_endpoints_never_expose_another_owners_business(owner_client, other, biz):
    other_biz = make_business(other, "Other Biz")
    r = owner_client.get("/api/v1/business/me/")
    assert r.json()["id"] == str(biz.id)
    assert owner_client.get(f"/api/v1/business/{other_biz.id}/").status_code == 404


def test_draft_storefront_is_invisible_to_anonymous_and_other_owners(anon, other_client, owner):
    draft = make_business(owner, "Secret Draft", status="DRAFT")
    for c in (anon, other_client):
        assert c.get(f"/api/v1/storefronts/{draft.slug}/").status_code == 404
        assert c.get(f"/api/v1/storefronts/{draft.slug}/?preview=1").status_code == 404
    missing = anon.get("/api/v1/storefronts/does-not-exist/")
    assert missing.json() == anon.get(f"/api/v1/storefronts/{draft.slug}/").json()  # drafts cannot be told apart from missing
    assert draft.slug not in str(anon.get("/api/v1/storefronts/").json())


def test_owner_can_preview_own_draft_only_with_flag(owner_client, owner):
    draft = make_business(owner, "My Draft", status="DRAFT")
    assert owner_client.get(f"/api/v1/storefronts/{draft.slug}/").status_code == 404
    r = owner_client.get(f"/api/v1/storefronts/{draft.slug}/?preview=1")
    assert r.status_code == 200 and r.json()["isPreview"] is True


def test_public_storefront_exposes_only_opted_in_fields(anon, owner):
    b = make_business(owner, "Public Biz", whatsapp="0700 999 000", show_phone=True, show_email=False)
    r = anon.get(f"/api/v1/storefronts/{b.slug}/").json()["business"]
    assert r["phone"] == "0700 111 222" and r["whatsapp"] == "0700 999 000"
    assert "email" not in r and "ownerId" not in r and "status" not in r and "createdAt" not in r
    b.show_phone, b.show_email = False, True
    b.save()
    r = anon.get(f"/api/v1/storefronts/{b.slug}/").json()["business"]
    assert "phone" not in r and "whatsapp" not in r and r["email"] == "private@example.com"
    assert "owner" not in str(r)


def test_prices_hidden_and_stock_states_on_storefront(anon, owner):
    b = make_business(owner, "Prices", show_prices=False)
    make_item(b, "A")
    make_item(b, "Sold out", track_stock=True, quantity=0)
    make_item(b, "Low", track_stock=True, quantity=3)
    make_item(b, "Off", available=False)
    items = {i["name"]: i for i in anon.get(f"/api/v1/storefronts/{b.slug}/").json()["items"]}
    assert all(i["price"] is None for i in items.values())
    assert items["A"]["available"] and not items["Sold out"]["available"] and not items["Off"]["available"]
    assert items["Low"]["stockNote"] == "Only 3 left"
    assert "quantity" not in items["Low"]  # exact stock is private


def test_storefront_list_filters_published_only(anon, owner, other):
    make_business(owner, "Fish A")
    make_business(other, "Tailor B", category="CLOTHING_TAILORING", description="Custom clothes and alterations.")
    make_business(make_user("c@example.com"), "Hidden", status="DRAFT")
    names = lambda url: {b["name"] for b in anon.get(url).json()["results"]}
    assert names("/api/v1/storefronts/") == {"Fish A", "Tailor B"}
    assert names("/api/v1/storefronts/?category=CLOTHING_TAILORING") == {"Tailor B"}
    assert names("/api/v1/storefronts/?q=fish") == {"Fish A"}


def test_unpublish_removes_from_public(anon, owner_client, owner):
    b = make_business(owner)
    assert anon.get(f"/api/v1/storefronts/{b.slug}/").status_code == 200
    owner_client.post("/api/v1/business/me/unpublish/")
    assert anon.get(f"/api/v1/storefronts/{b.slug}/").status_code == 404


def test_missing_resources_use_a_generic_message_but_deliberate_ones_are_kept(anon, owner_client):
    r = anon.get("/api/v1/nonexistent/")
    assert r.status_code == 404 and r["Content-Type"].startswith("application/json") and r.json()["error"]["code"] == "not_found"
    assert anon.get("/api/v1/storefronts/nope/").json()["error"]["message"] == "This storefront is not available."
    assert owner_client.get("/api/v1/business/me/").json()["error"]["message"] == "You have not created a business profile yet."

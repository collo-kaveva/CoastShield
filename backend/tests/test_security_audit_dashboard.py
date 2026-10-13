import pytest

from apps.audit import services as audit
from apps.audit.models import AuditEvent

from .conftest import client_for, make_business, make_item, make_user

pytestmark = pytest.mark.django_db


def test_checklist_lists_seeded_items_unticked(owner_client):
    items = owner_client.get("/api/v1/security/checklist/").json()
    assert len(items) == 12 and not any(i["done"] for i in items)
    assert {"key", "group", "title", "description", "done"} == set(items[0])


def test_checklist_progress_persists_and_is_isolated_between_users(owner_client, other_client):
    r = owner_client.put("/api/v1/security/checklist/mfa-on/", {"done": True}, format="json")
    assert r.status_code == 200 and [i["key"] for i in r.json() if i["done"]] == ["mfa-on"]
    assert not any(i["done"] for i in other_client.get("/api/v1/security/checklist/").json())
    owner_client.put("/api/v1/security/checklist/mfa-on/", {"done": True}, format="json")  # idempotent
    assert sum(i["done"] for i in owner_client.get("/api/v1/security/checklist/").json()) == 1
    other_client.put("/api/v1/security/checklist/pw-unique/", {"done": True}, format="json")
    assert [i["key"] for i in owner_client.get("/api/v1/security/checklist/").json() if i["done"]] == ["mfa-on"]
    owner_client.put("/api/v1/security/checklist/mfa-on/", {"done": False}, format="json")
    assert not any(i["done"] for i in owner_client.get("/api/v1/security/checklist/").json())


def test_checklist_ignores_a_client_supplied_user_and_rejects_bad_input(owner_client, other, owner):
    owner_client.put("/api/v1/security/checklist/mfa-on/", {"done": True, "user": str(other.id), "userId": str(other.id)}, format="json")
    from apps.cybersecurity.models import UserChecklistProgress
    assert UserChecklistProgress.objects.get().user_id == owner.id
    assert owner_client.put("/api/v1/security/checklist/not-real/", {"done": True}, format="json").status_code == 404
    assert owner_client.put("/api/v1/security/checklist/mfa-on/", {"done": "maybe"}, format="json").status_code == 422
    assert owner_client.put("/api/v1/security/checklist/mfa-on/", {}, format="json").status_code == 422


def test_checklist_requires_login(anon):
    assert anon.get("/api/v1/security/checklist/").status_code == 401
    assert anon.put("/api/v1/security/checklist/mfa-on/", {"done": True}, format="json").status_code == 401


def test_checklist_changes_are_audited_without_extra_data(owner_client):
    owner_client.put("/api/v1/security/checklist/mfa-on/", {"done": True}, format="json")
    e = AuditEvent.objects.get(action="CHECKLIST_CHANGED")
    assert e.target_id == "mfa-on" and e.metadata == {"done": True}


def test_only_administrators_can_read_audit_events(owner_client, anon, admin_user, owner):
    owner_client.put("/api/v1/security/checklist/mfa-on/", {"done": True}, format="json")
    assert owner_client.get("/api/v1/audit/events/").status_code == 403
    assert anon.get("/api/v1/audit/events/").status_code == 401
    r = client_for(admin_user).get("/api/v1/audit/events/?action=CHECKLIST_CHANGED")
    assert r.status_code == 200 and r.json()["count"] == 1
    assert set(r.json()["results"][0]) == {"id", "action", "actorId", "targetType", "targetId", "metadata", "createdAt"}


def test_a_staff_flag_alone_does_not_make_an_admin(db):
    staff_owner = make_user("staff@example.com")
    staff_owner.is_staff = True
    staff_owner.save()
    assert client_for(staff_owner).get("/api/v1/audit/events/").status_code == 403


def test_admin_has_no_route_to_owners_business_or_orders(admin_user, biz):
    c = client_for(admin_user)
    assert c.get("/api/v1/business/me/").status_code == 404  # sees only their own (none)
    assert c.get("/api/v1/orders/").json()["results"] == []
    assert c.get("/api/v1/catalog/items/").json()["results"] == []


def test_audit_service_strips_sensitive_metadata():
    e = audit.record("TEST", metadata={"password": "x", "token": "y", "message": "z", "notes": "n", "email": "e@e.com", "safe": 1})
    assert e.metadata == {"safe": 1}


def test_admin_site_does_not_expose_orders_or_catalog(db):
    from django.contrib import admin
    from apps.catalog.models import CatalogItem
    from apps.orders.models import OrderRequest
    assert OrderRequest not in admin.site._registry and CatalogItem not in admin.site._registry


def test_audit_events_cannot_be_edited_in_admin(admin_user):
    from django.contrib import admin
    from apps.audit.models import AuditEvent as AE
    m = admin.site._registry[AE]
    assert not m.has_change_permission(None) and not m.has_delete_permission(None) and not m.has_add_permission(None)


def test_dashboard_for_new_owner_is_honest_zeroes(owner_client):
    d = owner_client.get("/api/v1/dashboard/summary/").json()
    assert d["business"] is None and d["itemCount"] == 0 and d["newOrders"] == 0 and d["recentOrders"] == []
    assert d["completion"] == {"percent": 0, "missing": ["business profile"]} and d["checklist"] == {"done": 0, "total": 12}


def test_dashboard_reflects_real_data_only(owner_client, anon, biz):
    item = make_item(biz)
    for i in range(3):
        anon.post(f"/api/v1/storefronts/{biz.slug}/orders/", {"customerName": "Cust", "customerContact": f"0700 000 00{i}", "items": [{"itemId": str(item.id), "quantity": 1}]}, format="json")
    owner_client.put("/api/v1/security/checklist/mfa-on/", {"done": True}, format="json")
    oid = owner_client.get("/api/v1/orders/").json()["results"][0]["id"]
    owner_client.post(f"/api/v1/orders/{oid}/transition/", {"to": "CANCELLED"}, format="json")
    d = owner_client.get("/api/v1/dashboard/summary/").json()
    assert (d["itemCount"], d["newOrders"], d["outstandingOrders"], len(d["recentOrders"])) == (1, 2, 2, 3)
    assert d["checklist"] == {"done": 1, "total": 12} and d["completion"]["percent"] == 100
    other = make_user("o2@example.com")
    ob = make_business(other, "Other Biz")
    assert client_for(other).get("/api/v1/dashboard/summary/").json()["recentOrders"] == []


def test_openapi_schema_is_generated(anon):
    r = anon.get("/api/v1/schema/")
    assert r.status_code == 200 and b"/api/v1/orders/" in r.content


def test_seed_demo_is_idempotent_labelled_and_resettable(anon):
    from django.core.management import call_command
    from apps.businesses.models import BusinessProfile
    call_command("seed_demo")
    call_command("seed_demo")
    assert BusinessProfile.objects.count() == 8 and not BusinessProfile.objects.filter(is_sample=False).exists()
    names = {b["name"] for b in anon.get("/api/v1/storefronts/").json()["results"]}
    assert "Mama Fatuma's Fresh Catch" in names and "Diani Dhow Tours" in names
    assert all(b["isSample"] for b in anon.get("/api/v1/storefronts/").json()["results"])
    from rest_framework.test import APIClient
    c = APIClient()
    assert c.post("/api/v1/auth/login/", {"email": "fatuma@example.com", "password": "demo-password"}, format="json").status_code == 200
    assert len(c.get("/api/v1/orders/").json()["results"]) == 3
    call_command("seed_demo", "--remove-only")
    assert BusinessProfile.objects.count() == 0

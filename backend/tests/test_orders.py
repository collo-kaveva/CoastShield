import pytest
from django.utils import timezone

from apps.audit.models import AuditEvent
from apps.orders.models import OrderItem, OrderRequest
from rest_framework.throttling import ScopedRateThrottle

from .conftest import client_for, make_business, make_item, make_user

pytestmark = pytest.mark.django_db


@pytest.fixture
def store(biz):
    return {"biz": biz, "tilapia": make_item(biz, "Tilapia", "450.00", track_stock=True, quantity=10),
            "prawns": make_item(biz, "Prawns", "1400.00"), "plate": make_item(biz, "Plate", "350.00", available=False)}


def payload(store, **kw):
    base = {"customerName": "Test Customer", "customerContact": "0700 123 456", "notes": "", "items": [{"itemId": str(store["tilapia"].id), "quantity": 2}]}
    base.update(kw)
    return base


def submit(c, store, **kw):
    return c.post(f"/api/v1/storefronts/{store['biz'].slug}/orders/", payload(store, **kw), format="json")


def test_customer_submits_and_gets_only_a_reference(anon, store):
    r = submit(anon, store)
    assert r.status_code == 201
    assert set(r.json()) == {"reference", "businessName", "createdAt"}
    assert r.json()["reference"].startswith("CS-") and len(r.json()["reference"]) == 9
    o = OrderRequest.objects.get()
    assert o.status == "NEW" and o.payment_status == "UNPAID" and o.events.count() == 1


def test_references_are_unique(anon, store):
    refs = {submit(anon, store, customerContact=f"0700 000 0{i:02d}").json()["reference"] for i in range(8)}
    assert len(refs) == 8


def test_server_sets_prices_and_ignores_client_supplied_fields(anon, store):
    sneaky = payload(store, status="COMPLETED", paymentStatus="PAID", payment_status="PAID", unitPrice=1, price=1, reference="CS-HACKED")
    sneaky["items"][0].update(unitPrice=1, price=1, name="Free fish")
    assert submit(anon, store, **{k: v for k, v in sneaky.items() if k not in ("customerName", "customerContact", "notes", "items")}).status_code == 201
    r = anon.post(f"/api/v1/storefronts/{store['biz'].slug}/orders/", {**sneaky, "customerContact": "0700 999 999"}, format="json")
    assert r.status_code == 201 and r.json()["reference"] != "CS-HACKED"
    for o in OrderRequest.objects.all():
        assert o.status == "NEW" and o.payment_status == "UNPAID"
        line = o.lines.get()
        assert line.unit_price_snapshot == 450 and line.name_snapshot == "Tilapia"


@pytest.mark.parametrize("qty", [0, -1, 100, 1.5, "abc", None])
def test_invalid_quantities_rejected(anon, store, qty):
    r = submit(anon, store, items=[{"itemId": str(store["tilapia"].id), "quantity": qty}])
    assert r.status_code == 422


def test_unavailable_foreign_unknown_duplicate_and_overstock(anon, store, other):
    foreign = make_item(make_business(other, "Other Biz"), "Foreign")
    msg = lambda items: submit(anon, store, items=items).json()["error"]["message"]
    assert "unavailable" in msg([{"itemId": str(store["plate"].id), "quantity": 1}])
    assert "not available from this business" in msg([{"itemId": str(foreign.id), "quantity": 1}])
    assert "not available from this business" in msg([{"itemId": "not-a-uuid", "quantity": 1}])
    assert "not available from this business" in msg([{"itemId": "00000000-0000-0000-0000-000000000000", "quantity": 1}])
    t = str(store["tilapia"].id)
    assert "not available from this business" in msg([{"itemId": t, "quantity": 1}, {"itemId": t, "quantity": 1}])
    assert "Only 10" in msg([{"itemId": t, "quantity": 11}])
    assert OrderRequest.objects.count() == 0


def test_customer_detail_validation_and_enquiry_rules(anon, store):
    r = submit(anon, store, customerName="", customerContact="hello")
    f = r.json()["error"]["fields"]
    assert r.status_code == 422 and "customerName" in f and "customerContact" in f
    assert "notes" in submit(anon, store, items=[], notes="").json()["error"]["fields"]
    assert submit(anon, store, items=[], notes="Do you deliver to Nyali?").status_code == 201
    assert "notes" in submit(anon, store, notes="x" * 501).json()["error"]["fields"]


def test_cannot_order_from_draft_or_unknown_storefront(anon, store, owner):
    draft = make_business(make_user("d@example.com"), "Draft Shop", status="DRAFT")
    assert anon.post(f"/api/v1/storefronts/{draft.slug}/orders/", {"customerName": "Test", "customerContact": "0700 123 456", "notes": "Hello there"}, format="json").status_code == 404
    assert anon.post("/api/v1/storefronts/nope/orders/", {}, format="json").status_code == 404


def test_rapid_duplicate_submission_is_blocked_once(anon, store):
    assert submit(anon, store).status_code == 201
    assert submit(anon, store).status_code == 409
    assert OrderRequest.objects.count() == 1
    assert submit(anon, store, items=[{"itemId": str(store["prawns"].id), "quantity": 1}]).status_code == 201


def test_public_order_submission_is_rate_limited(anon, store, monkeypatch):
    monkeypatch.setitem(ScopedRateThrottle.THROTTLE_RATES, "order_submit", "3/min")
    codes = [submit(anon, store, customerContact=f"0700 111 {i:03d}").status_code for i in range(5)]
    assert codes == [201, 201, 201, 429, 429]


def test_owner_lists_views_and_orders_are_scoped(owner_client, other_client, anon, store):
    ref = submit(anon, store).json()["reference"]
    mine = owner_client.get("/api/v1/orders/").json()["results"]
    assert len(mine) == 1 and mine[0]["reference"] == ref and mine[0]["customerContact"] == "0700 123 456"
    assert mine[0]["items"][0] == {"itemId": str(store["tilapia"].id), "name": "Tilapia", "unitPrice": 450, "quantity": 2}
    oid = mine[0]["id"]
    assert owner_client.get(f"/api/v1/orders/{oid}/").status_code == 200
    assert other_client.get("/api/v1/orders/").json()["results"] == []
    for method, url, body in [("get", f"/api/v1/orders/{oid}/", None), ("post", f"/api/v1/orders/{oid}/transition/", {"to": "ACCEPTED"}),
                              ("post", f"/api/v1/orders/{oid}/payment/", {"status": "PAID"})]:
        assert getattr(other_client, method)(url, *( [body] if body else []), **({"format": "json"} if body else {})).status_code == 404
    assert anon.get(f"/api/v1/orders/{oid}/").status_code in (401, 403)
    assert OrderRequest.objects.get().status == "NEW"


def test_status_workflow_history_and_audit(owner_client, anon, store):
    submit(anon, store)
    oid = owner_client.get("/api/v1/orders/").json()["results"][0]["id"]
    t = lambda to: owner_client.post(f"/api/v1/orders/{oid}/transition/", {"to": to}, format="json")
    assert t("COMPLETED").status_code == 409 and t("READY").status_code == 409
    assert t("ACCEPTED").json()["status"] == "ACCEPTED" and t("READY").status_code == 200
    done = t("COMPLETED").json()
    assert done["status"] == "COMPLETED"
    assert [h["label"] for h in done["history"]] == ["Request received", "Status changed to Accepted", "Status changed to Ready", "Status changed to Completed"]
    assert t("CANCELLED").status_code == 409 and t("NEW").status_code == 409 and t("bogus").status_code == 422
    evs = AuditEvent.objects.filter(action="ORDER_STATUS_CHANGED")
    assert evs.count() == 3 and evs.first().metadata.keys() == {"from", "to"}


def test_cancel_path_and_payment_rules(owner_client, anon, store):
    submit(anon, store)
    oid = owner_client.get("/api/v1/orders/").json()["results"][0]["id"]
    pay = lambda s: owner_client.post(f"/api/v1/orders/{oid}/payment/", {"status": s}, format="json")
    assert pay("PAID").json()["paymentStatus"] == "PAID"
    assert pay("PAID").json()["history"][-1]["label"] == "Payment recorded manually as Paid"
    assert pay("MAYBE").status_code == 422
    assert owner_client.post(f"/api/v1/orders/{oid}/transition/", {"to": "CANCELLED"}, format="json").json()["status"] == "CANCELLED"
    assert pay("UNPAID").status_code == 409
    assert AuditEvent.objects.filter(action="ORDER_PAYMENT_RECORDED").exists()


def test_customers_cannot_change_orders_through_public_routes(anon, store, owner_client):
    submit(anon, store)
    o = OrderRequest.objects.get()
    for url, body in [(f"/api/v1/orders/{o.id}/transition/", {"to": "COMPLETED"}), (f"/api/v1/orders/{o.id}/payment/", {"status": "PAID"})]:
        assert anon.post(url, body, format="json").status_code in (401, 403)
    o.refresh_from_db()
    assert o.status == "NEW" and o.payment_status == "UNPAID"


def test_order_history_survives_catalog_changes(owner_client, anon, store):
    submit(anon, store)
    owner_client.delete(f"/api/v1/catalog/items/{store['tilapia'].id}/")
    o = owner_client.get("/api/v1/orders/").json()["results"][0]
    assert o["items"][0]["name"] == "Tilapia" and o["items"][0]["unitPrice"] == 450
    assert OrderItem.objects.get().item is None


def test_customer_lookup_needs_matching_contact_and_leaks_nothing(anon, store):
    ref = submit(anon, store).json()["reference"]
    ok = anon.post("/api/v1/orders/lookup/", {"reference": ref.lower(), "contact": "+254 700 123 456"}, format="json")
    assert ok.status_code == 200
    body = ok.json()
    assert body["status"] == "NEW" and body["items"] == [{"name": "Tilapia", "quantity": 2}]
    assert "customerContact" not in body and "customerName" not in body and "notes" not in body
    wrong = anon.post("/api/v1/orders/lookup/", {"reference": ref, "contact": "0700 000 000"}, format="json")
    missing = anon.post("/api/v1/orders/lookup/", {"reference": "CS-NOPE22", "contact": "0700 123 456"}, format="json")
    assert wrong.status_code == missing.status_code == 404 and wrong.json() == missing.json()
    assert "No matching request found" in wrong.json()["error"]["message"]  # helpful, and identical for both cases


def test_order_lookup_is_rate_limited(anon, store, monkeypatch):
    monkeypatch.setitem(ScopedRateThrottle.THROTTLE_RATES, "order_lookup", "2/min")
    codes = [anon.post("/api/v1/orders/lookup/", {"reference": f"CS-AAAA{i}2", "contact": "0700 000 000"}, format="json").status_code for i in range(4)]
    assert codes == [404, 404, 429, 429]


def test_audit_log_has_no_customer_data(anon, store):
    submit(anon, store, customerName="Secret Name", customerContact="secret.person@example.com", notes="my private notes here")
    blob = " ".join(str(e.metadata) for e in AuditEvent.objects.all())
    assert "Secret" not in blob and "secret.person" not in blob and "private notes" not in blob

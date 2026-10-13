import pytest

from apps.catalog.models import CatalogItem

from .conftest import make_business, make_item

pytestmark = pytest.mark.django_db
ITEM = {"name": "Tilapia", "description": "Whole fish", "price": 450, "category": "Fish", "available": True, "trackStock": False, "quantity": None}


def test_owner_full_crud_on_own_items(owner_client, biz):
    r = owner_client.post("/api/v1/catalog/items/", ITEM, format="json")
    assert r.status_code == 201 and r.json()["price"] == 450 and r.json()["businessId"] == str(biz.id)
    iid = r.json()["id"]
    assert owner_client.put(f"/api/v1/catalog/items/{iid}/", {**ITEM, "price": 500}, format="json").json()["price"] == 500
    assert len(owner_client.get("/api/v1/catalog/items/").json()["results"]) == 1
    assert owner_client.delete(f"/api/v1/catalog/items/{iid}/").status_code == 204
    assert CatalogItem.objects.count() == 0


def test_cannot_create_without_business(owner_client):
    assert owner_client.post("/api/v1/catalog/items/", ITEM, format="json").status_code == 404
    assert owner_client.get("/api/v1/catalog/items/").json()["results"] == []


def test_price_and_quantity_validated_on_server(owner_client, biz):
    for bad in [{"price": -1}, {"price": 10_000_001}, {"price": "abc"}, {"name": "x"}, {"trackStock": True, "quantity": None},
                {"trackStock": True, "quantity": -1}, {"trackStock": True, "quantity": 1.5}]:
        assert owner_client.post("/api/v1/catalog/items/", {**ITEM, **bad}, format="json").status_code == 422, bad
    ok = owner_client.post("/api/v1/catalog/items/", {**ITEM, "price": None}, format="json")
    assert ok.status_code == 201 and ok.json()["price"] is None  # "ask for price"
    assert owner_client.post("/api/v1/catalog/items/", {**ITEM, "trackStock": False, "quantity": 7}, format="json").json()["quantity"] is None


def test_other_owner_cannot_read_edit_or_delete_items(owner_client, other_client, other):
    ob = make_business(other, "Other Biz")
    item = make_item(ob)
    assert owner_client.get("/api/v1/catalog/items/").json()["results"] == []
    assert owner_client.get(f"/api/v1/catalog/items/{item.id}/").status_code == 404
    assert owner_client.put(f"/api/v1/catalog/items/{item.id}/", ITEM, format="json").status_code == 404
    assert owner_client.delete(f"/api/v1/catalog/items/{item.id}/").status_code == 404
    assert CatalogItem.objects.filter(id=item.id).exists()


def test_cannot_inject_business_id_when_creating(owner_client, biz, other):
    ob = make_business(other, "Other Biz")
    r = owner_client.post("/api/v1/catalog/items/", {**ITEM, "businessId": str(ob.id), "business": str(ob.id)}, format="json")
    assert r.json()["businessId"] == str(biz.id)
    assert not CatalogItem.objects.filter(business=ob).exists()


def test_public_cannot_modify_catalog(anon, biz):
    item = make_item(biz)
    assert anon.post("/api/v1/catalog/items/", ITEM, format="json").status_code in (401, 403)
    assert anon.put(f"/api/v1/catalog/items/{item.id}/", ITEM, format="json").status_code in (401, 403)
    assert anon.delete(f"/api/v1/catalog/items/{item.id}/").status_code in (401, 403)
    assert anon.put(f"/api/v1/storefronts/{biz.slug}/", ITEM, format="json").status_code == 405


def test_db_constraints_back_up_validation(biz):
    from django.db import IntegrityError, transaction
    with pytest.raises(IntegrityError), transaction.atomic():
        CatalogItem.objects.create(business=biz, name="Bad", price=-5)
    with pytest.raises(IntegrityError), transaction.atomic():
        CatalogItem.objects.create(business=biz, name="Bad", track_stock=True, quantity=None)

import re
import secrets
import uuid
from datetime import timedelta

from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError

from apps.audit import services as audit
from apps.businesses.models import BusinessProfile
from apps.catalog.models import CatalogItem
from apps.common.errors import Conflict

from .models import OrderEvent, OrderItem, OrderRequest

TRANSITIONS = {
    "NEW": ["ACCEPTED", "CANCELLED"], "ACCEPTED": ["READY", "CANCELLED"], "READY": ["COMPLETED", "CANCELLED"],
    "COMPLETED": [], "CANCELLED": [],
}
LABEL = {"NEW": "New", "ACCEPTED": "Accepted", "READY": "Ready", "COMPLETED": "Completed", "CANCELLED": "Cancelled"}
REF_CHARS = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"


def _new_reference() -> str:
    return "CS-" + "".join(secrets.choice(REF_CHARS) for _ in range(6))


def _signature(pairs) -> str:
    return ",".join(sorted(f"{i}x{q}" for i, q in pairs))


@transaction.atomic
def create_order(slug: str, data: dict) -> OrderRequest:
    """All trust decisions happen here: the client supplies only item ids and quantities."""
    business = BusinessProfile.objects.filter(slug=slug, status=BusinessProfile.Status.PUBLISHED).first()
    if not business:
        raise NotFound("This storefront is not available.")

    lines = data["items"]
    wanted = {}
    for line in lines:
        try:
            iid = uuid.UUID(str(line["itemId"]))
        except ValueError:
            raise ValidationError("One of the selected items is not available from this business.")
        if iid in wanted:
            raise ValidationError("One of the selected items is not available from this business.")
        wanted[iid] = line["quantity"]

    items = {i.id: i for i in CatalogItem.objects.select_for_update().filter(business=business, id__in=wanted.keys())}
    if len(items) != len(wanted):
        raise ValidationError("One of the selected items is not available from this business.")
    for iid, qty in wanted.items():
        it = items[iid]
        if not it.available or (it.track_stock and it.quantity == 0):
            raise ValidationError(f"“{it.name}” is currently unavailable.")
        if it.track_stock and it.quantity is not None and qty > it.quantity:
            raise ValidationError(f"Only {it.quantity} of “{it.name}” available.")

    contact = data["customerContact"].strip()
    since = timezone.now() - timedelta(seconds=60)
    sig = _signature((str(i), q) for i, q in wanted.items())
    for recent in OrderRequest.objects.filter(business=business, customer_contact=contact, status="NEW", created_at__gte=since).prefetch_related("lines"):
        if _signature((str(l.item_id), l.quantity) for l in recent.lines.all()) == sig:
            raise Conflict("This request was just sent. Please wait a minute before sending it again.")

    for _ in range(5):  # reference collisions are astronomically unlikely, but the unique index is the real guard
        try:
            with transaction.atomic():
                order = OrderRequest.objects.create(
                    business=business, reference=_new_reference(), customer_name=data["customerName"].strip(),
                    customer_contact=contact, notes=data.get("notes", "").strip(),
                )
            break
        except IntegrityError:
            continue
    else:
        raise ValidationError("Could not create a reference. Please try again.")

    OrderItem.objects.bulk_create([
        OrderItem(order=order, item=items[iid], name_snapshot=items[iid].name, unit_price_snapshot=items[iid].price, quantity=qty)
        for iid, qty in wanted.items()
    ])
    OrderEvent.objects.create(order=order, label="Request received")
    audit.record("ORDER_CREATED", target_type="order", target_id=order.id, metadata={"business": str(business.id), "lines": len(wanted)})
    return order


@transaction.atomic
def transition(order_id, owner, to: str, request=None) -> OrderRequest:
    order = OrderRequest.objects.select_for_update().filter(id=order_id, business__owner=owner).first()
    if not order:
        raise NotFound("Order not found.")
    if to not in TRANSITIONS[order.status]:
        raise Conflict(f"A {LABEL[order.status].lower()} request cannot be changed to {LABEL[to].lower()}.")
    previous, order.status = order.status, to
    order.save(update_fields=["status", "updated_at"])
    OrderEvent.objects.create(order=order, label=f"Status changed to {LABEL[to]}")
    audit.record("ORDER_STATUS_CHANGED", actor=owner, target_type="order", target_id=order.id, metadata={"from": previous, "to": to}, request=request)
    return order


@transaction.atomic
def set_payment(order_id, owner, status: str, request=None) -> OrderRequest:
    order = OrderRequest.objects.select_for_update().filter(id=order_id, business__owner=owner).first()
    if not order:
        raise NotFound("Order not found.")
    if order.status == "CANCELLED":
        raise Conflict("Cancelled requests cannot be marked as paid.")
    order.payment_status = status
    order.save(update_fields=["payment_status", "updated_at"])
    OrderEvent.objects.create(order=order, label=f"Payment recorded manually as {'Paid' if status == 'PAID' else 'Unpaid'}")
    audit.record("ORDER_PAYMENT_RECORDED", actor=owner, target_type="order", target_id=order.id, metadata={"status": status}, request=request)
    return order


def _norm_contact(value: str) -> str:
    v = value.strip().lower()
    if "@" in v:
        return v
    digits = re.sub(r"\D", "", v)
    return digits[-9:]  # compare 0700 123 456, +254700123456 and 254700123456 as equal


def lookup(reference: str, contact: str):
    """Customer check: reference AND matching contact. Any mismatch looks identical to 'not found'."""
    order = OrderRequest.objects.filter(reference=reference.strip().upper()).select_related("business").prefetch_related("lines").first()
    if not order or not secrets.compare_digest(_norm_contact(order.customer_contact), _norm_contact(contact)):
        raise NotFound("No matching request found. Check the reference and the phone number or email you used.")
    return order

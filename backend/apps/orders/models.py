import uuid

from django.db import models
from django.db.models import Q


class OrderRequest(models.Model):
    class Status(models.TextChoices):
        NEW = "NEW"
        ACCEPTED = "ACCEPTED"
        READY = "READY"
        COMPLETED = "COMPLETED"
        CANCELLED = "CANCELLED"

    class Payment(models.TextChoices):
        UNPAID = "UNPAID"
        PAID = "PAID"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.ForeignKey("businesses.BusinessProfile", on_delete=models.CASCADE, related_name="orders")
    reference = models.CharField(max_length=12, unique=True)
    customer_name = models.CharField(max_length=80)
    customer_contact = models.CharField(max_length=254)
    notes = models.CharField(max_length=500, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.NEW)
    # Recorded manually by the owner only. Never derived from customer input, messages or screenshots.
    payment_status = models.CharField(max_length=6, choices=Payment.choices, default=Payment.UNPAID)
    payment_method = models.CharField(max_length=30, blank=True, help_text="Payment method used (PAYSTACK, CASH_ON_DELIVERY, MANUAL_MOBILE_MONEY)")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["business", "status"]), models.Index(fields=["business", "-created_at"])]


class OrderItem(models.Model):
    """Name and price are copied at order time so history never changes if the catalog does."""
    order = models.ForeignKey(OrderRequest, on_delete=models.CASCADE, related_name="lines")
    item = models.ForeignKey("catalog.CatalogItem", null=True, on_delete=models.SET_NULL, related_name="+")
    name_snapshot = models.CharField(max_length=80)
    unit_price_snapshot = models.DecimalField(max_digits=10, decimal_places=2, null=True)
    quantity = models.PositiveSmallIntegerField()

    class Meta:
        constraints = [models.CheckConstraint(condition=Q(quantity__gte=1) & Q(quantity__lte=99), name="orderitem_quantity_range")]


class OrderEvent(models.Model):
    """Human-readable status history shown to the owner."""
    order = models.ForeignKey(OrderRequest, on_delete=models.CASCADE, related_name="events")
    label = models.CharField(max_length=80)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]

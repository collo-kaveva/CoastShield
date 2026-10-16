import uuid

from django.db import models
from django.db.models import Q


class Payment(models.Model):
    """Represents a payment for an order. Can be Paystack, cash-on-delivery, or manual mobile money."""
    class Method(models.TextChoices):
        PAYSTACK = "PAYSTACK"
        CASH_ON_DELIVERY = "CASH_ON_DELIVERY"
        MANUAL_MOBILE_MONEY = "MANUAL_MOBILE_MONEY"

    class Status(models.TextChoices):
        PENDING = "PENDING"
        PROCESSING = "PROCESSING"
        COMPLETED = "COMPLETED"
        FAILED = "FAILED"
        CANCELLED = "CANCELLED"
        REFUNDED = "REFUNDED"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference = models.CharField(max_length=20, unique=True, db_index=True)
    order = models.OneToOneField("orders.OrderRequest", on_delete=models.CASCADE, related_name="payment")
    method = models.CharField(max_length=20, choices=Method.choices)
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.PENDING)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default="KES")
    customer_email = models.EmailField(blank=True)
    customer_name = models.CharField(max_length=100, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["order", "status"]),
            models.Index(fields=["reference"]),
            models.Index(fields=["-created_at"]),
        ]

    def __str__(self):
        return f"{self.reference} - {self.method} - {self.status}"


class Transaction(models.Model):
    """Represents a transaction with a payment provider (e.g., Paystack)."""
    class Status(models.TextChoices):
        PENDING = "PENDING"
        SUCCESS = "SUCCESS"
        FAILED = "FAILED"
        REVERSED = "REVERSED"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name="transactions")
    provider_reference = models.CharField(max_length=100, unique=True, db_index=True)
    provider = models.CharField(max_length=20, default="paystack")
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.PENDING)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default="KES")
    fees = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    commission = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    subaccount_code = models.CharField(max_length=100, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    verified = models.BooleanField(default=False)
    verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["payment", "status"]),
            models.Index(fields=["provider_reference"]),
            models.Index(fields=["-created_at"]),
        ]

    def __str__(self):
        return f"{self.provider_reference} - {self.status}"


class Settlement(models.Model):
    """Represents a settlement from the payment provider to a business subaccount."""
    class Status(models.TextChoices):
        PENDING = "PENDING"
        PROCESSING = "PROCESSING"
        COMPLETED = "COMPLETED"
        FAILED = "FAILED"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference = models.CharField(max_length=100, unique=True, db_index=True)
    business = models.ForeignKey("businesses.BusinessProfile", on_delete=models.CASCADE, related_name="settlements")
    provider = models.CharField(max_length=20, default="paystack")
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.PENDING)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default="KES")
    fees = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    commission = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    net_amount = models.DecimalField(max_digits=12, decimal_places=2)
    settlement_date = models.DateField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["business", "status"]),
            models.Index(fields=["reference"]),
            models.Index(fields=["settlement_date"]),
        ]

    def __str__(self):
        return f"{self.reference} - {self.business.name} - {self.status}"


class Refund(models.Model):
    """Represents a refund for a payment."""
    class Status(models.TextChoices):
        PENDING = "PENDING"
        PROCESSING = "PROCESSING"
        COMPLETED = "COMPLETED"
        FAILED = "FAILED"
        CANCELLED = "CANCELLED"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference = models.CharField(max_length=100, unique=True, db_index=True)
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name="refunds")
    transaction = models.ForeignKey(Transaction, on_delete=models.SET_NULL, null=True, blank=True, related_name="refunds")
    provider_reference = models.CharField(max_length=100, blank=True)
    provider = models.CharField(max_length=20, default="paystack")
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.PENDING)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default="KES")
    reason = models.TextField(blank=True)
    initiated_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, related_name="initiated_refunds")
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["payment", "status"]),
            models.Index(fields=["reference"]),
            models.Index(fields=["-created_at"]),
        ]

    def __str__(self):
        return f"{self.reference} - {self.status}"

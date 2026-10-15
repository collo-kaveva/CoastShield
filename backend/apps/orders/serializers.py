import re

from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .models import OrderRequest

PHONE_RE = re.compile(r"^\+?[0-9][0-9\s-]{7,14}$")
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


class OrderLineInput(serializers.Serializer):
    itemId = serializers.CharField(max_length=64)
    quantity = serializers.IntegerField(min_value=1, max_value=99)


class OrderSubmitSerializer(serializers.Serializer):
    """Only these fields are read. Status, payment and prices sent by a client are ignored by construction."""
    customerName = serializers.CharField(min_length=2, max_length=80, error_messages={"blank": "Enter your name.", "min_length": "Enter your name."})
    customerContact = serializers.CharField(max_length=254)
    notes = serializers.CharField(max_length=500, allow_blank=True, required=False, default="", error_messages={"max_length": "Notes can be up to 500 characters."})
    items = OrderLineInput(many=True, required=False, default=list, max_length=30)

    def validate_customerContact(self, v):
        v = v.strip()
        if not (EMAIL_RE.match(v) or PHONE_RE.match(v)):
            raise serializers.ValidationError("Enter a phone number or email address.")
        return v

    def validate(self, attrs):
        if not attrs["items"] and len(attrs.get("notes", "").strip()) < 5:
            raise serializers.ValidationError({"notes": "Tell the business what you would like to ask."})
        return attrs


class OrderSerializer(serializers.ModelSerializer):
    """Owner's view of their own order."""
    id = serializers.CharField(read_only=True)
    businessId = serializers.CharField(source="business_id")
    customerName = serializers.CharField(source="customer_name")
    customerContact = serializers.CharField(source="customer_contact")
    paymentStatus = serializers.CharField(source="payment_status")
    createdAt = serializers.DateTimeField(source="created_at")
    updatedAt = serializers.DateTimeField(source="updated_at")
    isSample = serializers.BooleanField(source="business.is_sample")
    items = serializers.SerializerMethodField()
    history = serializers.SerializerMethodField()

    class Meta:
        model = OrderRequest
        fields = ["id", "reference", "businessId", "customerName", "customerContact", "notes", "items", "status", "paymentStatus",
                  "createdAt", "updatedAt", "history", "isSample"]

    @extend_schema_field(serializers.ListField(child=serializers.DictField()))
    def get_items(self, o):
        return [{"itemId": str(l.item_id or f"line-{l.id}"), "name": l.name_snapshot,
                 "unitPrice": float(l.unit_price_snapshot) if l.unit_price_snapshot is not None else None, "quantity": l.quantity}
                for l in o.lines.all()]

    @extend_schema_field(serializers.ListField(child=serializers.DictField()))
    def get_history(self, o):
        return [{"at": e.created_at.isoformat(), "label": e.label} for e in o.events.all()]


class TransitionSerializer(serializers.Serializer):
    to = serializers.ChoiceField(choices=OrderRequest.Status.values)


class PaymentSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=OrderRequest.Payment.values)


class LookupSerializer(serializers.Serializer):
    reference = serializers.CharField(max_length=12)
    contact = serializers.CharField(max_length=254)

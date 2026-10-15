import re

from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .models import BusinessProfile

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
PHONE_RE = re.compile(r"^\+?[0-9][0-9\s-]{7,14}$")
TIME_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


def validate_phone(value):
    if value and not PHONE_RE.match(value):
        raise serializers.ValidationError("Enter a valid phone number, for example 0700 000 000.")
    return value


class BusinessSerializer(serializers.ModelSerializer):
    """Owner's private view and the shape accepted when saving. camelCase matches the frontend types."""
    id = serializers.CharField(read_only=True)
    ownerId = serializers.SerializerMethodField()
    publicAddress = serializers.CharField(source="public_address", max_length=120, allow_blank=True, required=False, default="")
    phone = serializers.CharField(max_length=20, allow_blank=True, required=False, default="", validators=[validate_phone])
    whatsapp = serializers.CharField(max_length=20, allow_blank=True, required=False, default="", validators=[validate_phone])
    showPhone = serializers.BooleanField(source="show_phone", required=False, default=True)
    showEmail = serializers.BooleanField(source="show_email", required=False, default=False)
    showPrices = serializers.BooleanField(source="show_prices", required=False, default=True)
    logoUrl = serializers.SerializerMethodField()
    isSample = serializers.BooleanField(source="is_sample", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)
    name = serializers.CharField(min_length=2, max_length=80)
    description = serializers.CharField(max_length=400, allow_blank=True, required=False, default="")
    county = serializers.CharField(max_length=40, allow_blank=True, required=False, default="")
    town = serializers.CharField(max_length=60, allow_blank=True, required=False, default="")
    email = serializers.EmailField(allow_blank=True, required=False, default="")

    class Meta:
        model = BusinessProfile
        fields = ["id", "ownerId", "name", "category", "description", "county", "town", "publicAddress", "phone", "whatsapp",
                  "email", "showPhone", "showEmail", "hours", "showPrices", "slug", "status", "logoUrl", "isSample", "createdAt", "updatedAt"]
        read_only_fields = ["slug", "status"]

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_logoUrl(self, obj):
        return obj.logo.url if obj.logo else None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_ownerId(self, obj):
        return str(obj.owner_id) if obj.owner_id else None

    def validate_hours(self, value):
        if not isinstance(value, list) or len(value) != 7:
            raise serializers.ValidationError("Provide opening hours for all seven days.")
        clean = []
        for day, h in zip(DAYS, value):
            if not isinstance(h, dict) or h.get("day") != day or not isinstance(h.get("closed"), bool):
                raise serializers.ValidationError("Opening hours are not in the expected format.")
            if not (TIME_RE.match(str(h.get("open", ""))) and TIME_RE.match(str(h.get("close", "")))):
                raise serializers.ValidationError(f"Enter valid times for {day}.")
            clean.append({"day": day, "open": h["open"], "close": h["close"], "closed": h["closed"]})
        return clean

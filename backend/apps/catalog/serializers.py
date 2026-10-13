from rest_framework import serializers

from .models import CatalogItem


class CatalogItemSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    businessId = serializers.CharField(source="business_id", read_only=True)
    name = serializers.CharField(min_length=2, max_length=80)
    description = serializers.CharField(max_length=200, allow_blank=True, required=False, default="")
    price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0, max_value=10_000_000, allow_null=True, required=False, default=None, coerce_to_string=False)
    category = serializers.CharField(max_length=40, required=False, default="Items", allow_blank=False)
    available = serializers.BooleanField(required=False, default=True)
    trackStock = serializers.BooleanField(source="track_stock", required=False, default=False)
    quantity = serializers.IntegerField(min_value=0, max_value=1_000_000, allow_null=True, required=False, default=None)

    class Meta:
        model = CatalogItem
        fields = ["id", "businessId", "name", "description", "price", "category", "available", "trackStock", "quantity"]

    def validate(self, attrs):
        if attrs.get("track_stock"):
            if attrs.get("quantity") is None:
                raise serializers.ValidationError({"quantity": "Enter a whole number of 0 or more."})
        else:
            attrs["quantity"] = None
        return attrs

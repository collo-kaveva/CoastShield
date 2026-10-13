import uuid

from django.db import models
from django.db.models import Q


class CatalogItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.ForeignKey("businesses.BusinessProfile", on_delete=models.CASCADE, related_name="items")
    name = models.CharField(max_length=80)
    description = models.CharField(max_length=200, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    category = models.CharField(max_length=40, default="Items")
    available = models.BooleanField(default=True)
    track_stock = models.BooleanField(default=False)
    quantity = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [models.Index(fields=["business", "available"])]
        constraints = [
            models.CheckConstraint(condition=Q(price__isnull=True) | Q(price__gte=0), name="item_price_non_negative"),
            models.CheckConstraint(condition=Q(track_stock=False) | Q(quantity__isnull=False), name="item_quantity_when_tracked"),
        ]

    def __str__(self):
        return self.name

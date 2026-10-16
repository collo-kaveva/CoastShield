import uuid

from django.conf import settings
from django.db import models


class BusinessProfile(models.Model):
    class Category(models.TextChoices):
        FISH_SEAFOOD = "FISH_SEAFOOD", "Fish and seafood"
        RETAIL_MARKET = "RETAIL_MARKET", "Retail and market vending"
        FOOD_HOSPITALITY = "FOOD_HOSPITALITY", "Food and hospitality"
        CLOTHING_TAILORING = "CLOTHING_TAILORING", "Clothing and tailoring"
        REPAIRS_MECHANICS = "REPAIRS_MECHANICS", "Repairs and mechanics"
        TOURISM = "TOURISM", "Tourism and tour services"
        OTHER = "OTHER", "Other local services"

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        PUBLISHED = "PUBLISHED", "Published"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # One business per owner in the MVP. Null owner = ownerless, clearly flagged sample storefront.
    owner = models.OneToOneField(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.CASCADE, related_name="business")
    name = models.CharField(max_length=80)
    category = models.CharField(max_length=24, choices=Category.choices)
    description = models.CharField(max_length=400, blank=True)
    county = models.CharField(max_length=40, blank=True)
    town = models.CharField(max_length=60, blank=True)
    public_address = models.CharField(max_length=120, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    whatsapp = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    show_phone = models.BooleanField(default=True)
    show_email = models.BooleanField(default=False)
    hours = models.JSONField(default=list)
    show_prices = models.BooleanField(default=True)
    slug = models.SlugField(max_length=60, unique=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)
    logo = models.ImageField(upload_to="logos/", blank=True)
    paystack_subaccount_code = models.CharField(max_length=100, blank=True, help_text="Paystack subaccount code for transaction splitting")
    is_sample = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=["status", "category"])]

    def __str__(self):
        return self.name

from django.contrib import admin

from .models import BusinessProfile


@admin.register(BusinessProfile)
class BusinessProfileAdmin(admin.ModelAdmin):
    """Platform-level view of storefront metadata only. Contact details are hidden here by design."""
    list_display = ("name", "category", "status", "town", "is_sample", "created_at")
    list_filter = ("status", "category", "is_sample")
    search_fields = ("name", "slug")
    fields = ("name", "category", "status", "county", "town", "slug", "is_sample")
    readonly_fields = ("slug",)
    def has_add_permission(self, request): return False
    def has_delete_permission(self, request, obj=None): return False

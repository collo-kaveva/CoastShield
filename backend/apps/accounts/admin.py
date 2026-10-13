from django.contrib import admin

from .models import User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    """Administrators can see accounts but not password hashes, and cannot see business or customer data here."""
    list_display = ("email", "name", "role", "is_active", "date_joined")
    list_filter = ("role", "is_active")
    search_fields = ("email", "name")
    fields = ("email", "name", "role", "is_active", "date_joined")
    readonly_fields = ("email", "date_joined")
    def has_add_permission(self, request): return False
    def has_delete_permission(self, request, obj=None): return False

from rest_framework.permissions import BasePermission


class IsAdminRole(BasePermission):
    """Platform administrators only. Owners (even staff-less superusers by role) are not admins."""
    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and u.is_active and getattr(u, "role", None) == "ADMIN")

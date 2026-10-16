from rest_framework import permissions


class IsBusinessOwner(permissions.BasePermission):
    """Permission that only allows business owners to access."""
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == "OWNER"


class IsBusinessStaff(permissions.BasePermission):
    """Permission that allows business staff (owner or staff members) to access."""
    
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        return request.user.role in ["OWNER", "STAFF"]


class IsAdminOrBusinessOwner(permissions.BasePermission):
    """Permission that allows admins or business owners to access."""
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role in ["ADMIN", "OWNER"]


class IsEmailVerified(permissions.BasePermission):
    """Permission that only allows users with verified email addresses."""
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.email_verified


class BusinessObjectPermission(permissions.BasePermission):
    """Base permission for business-scoped objects."""
    
    def has_object_permission(self, request, view, obj):
        # Check if user owns the business or is a staff member
        if request.user.role == "ADMIN":
            return True
        
        if hasattr(obj, "business"):
            business = obj.business
        elif hasattr(obj, "business_id"):
            from apps.businesses.models import BusinessProfile
            business = BusinessProfile.objects.filter(id=obj.business_id).first()
        else:
            return False
        
        if not business:
            return False
        
        # Owner has full access
        if business.owner_id == request.user.id:
            return True
        
        # Check if user is staff for this business
        if request.user.role == "STAFF":
            from .staff import Staff
            return Staff.objects.filter(
                business=business,
                user=request.user,
                status=Staff.Status.ACTIVE
            ).exists()
        
        return False

import uuid

from django.db import models
from django.utils import timezone


class Staff(models.Model):
    """Business-scoped staff accounts with role-based access control."""
    
    class Role(models.TextChoices):
        MANAGER = "MANAGER", "Manager - Full access to business operations"
        SALES = "SALES", "Sales - Can manage orders and customers"
        INVENTORY = "INVENTORY", "Inventory - Can manage catalog and stock"
        VIEWER = "VIEWER", "Viewer - Read-only access"
    
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending invitation"
        ACTIVE = "ACTIVE", "Active"
        SUSPENDED = "SUSPENDED", "Suspended"
        DELETED = "DELETED", "Deleted"
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.ForeignKey("businesses.BusinessProfile", on_delete=models.CASCADE, related_name="staff")
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="staff_assignments")
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.VIEWER)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    invited_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, related_name="invited_staff")
    invitation_token = models.CharField(max_length=64, blank=True, db_index=True)
    invitation_expires_at = models.DateTimeField(null=True, blank=True)
    invited_at = models.DateTimeField(auto_now_add=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["business", "status"]),
            models.Index(fields=["user", "business"]),
            models.Index(fields=["invitation_token"]),
        ]
        unique_together = [["business", "user"]]
    
    def __str__(self):
        return f"{self.user.email} - {self.business.name} ({self.role})"
    
    def generate_invitation_token(self):
        """Generate a secure invitation token."""
        import secrets
        self.invitation_token = secrets.token_urlsafe(32)
        self.invitation_expires_at = timezone.now() + timezone.timedelta(days=7)
        self.save()
        return self.invitation_token
    
    def is_invitation_valid(self):
        """Check if invitation token is still valid."""
        if not self.invitation_token or not self.invitation_expires_at:
            return False
        return timezone.now() < self.invitation_expires_at
    
    def accept_invitation(self):
        """Accept the staff invitation."""
        self.status = self.Status.ACTIVE
        self.accepted_at = timezone.now()
        self.invitation_token = ""
        self.invitation_expires_at = None
        self.save()

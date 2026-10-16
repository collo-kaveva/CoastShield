import secrets
import uuid

from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _make(self, email, password, **extra):
        if not email:
            raise ValueError("Email is required")
        user = self.model(email=self.normalize_email(email).lower(), **extra)
        user.set_password(password)  # Django's hashing; the raw password is never stored
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra):
        extra.setdefault("role", User.Role.OWNER)
        return self._make(email, password, **extra)

    def create_superuser(self, email, password=None, **extra):
        extra.update(role=User.Role.ADMIN, is_staff=True, is_superuser=True)
        return self._make(email, password, **extra)


class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        OWNER = "OWNER", "Business owner"
        ADMIN = "ADMIN", "Administrator"
        STAFF = "STAFF", "Business staff"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=80)
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.OWNER)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)
    
    # Email verification
    email_verified = models.BooleanField(default=False)
    email_verification_token = models.CharField(max_length=64, blank=True, db_index=True)
    email_verification_expires_at = models.DateTimeField(null=True, blank=True)
    
    # MFA
    mfa_enabled = models.BooleanField(default=False)
    mfa_secret = models.CharField(max_length=32, blank=True)  # Base32 encoded TOTP secret
    mfa_backup_codes = models.JSONField(default=list, blank=True)  # List of hashed backup codes
    
    # Password reset
    password_reset_token = models.CharField(max_length=64, blank=True, db_index=True)
    password_reset_expires_at = models.DateTimeField(null=True, blank=True)
    
    # Account deletion
    deletion_requested_at = models.DateTimeField(null=True, blank=True)
    deletion_scheduled_at = models.DateTimeField(null=True, blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["name"]
    objects = UserManager()

    def __str__(self):
        return self.email
    
    def generate_email_verification_token(self):
        """Generate a secure email verification token."""
        self.email_verification_token = secrets.token_urlsafe(32)
        self.email_verification_expires_at = timezone.now() + timezone.timedelta(hours=24)
        self.save()
        return self.email_verification_token
    
    def generate_password_reset_token(self):
        """Generate a secure password reset token."""
        self.password_reset_token = secrets.token_urlsafe(32)
        self.password_reset_expires_at = timezone.now() + timezone.timedelta(hours=1)
        self.save()
        return self.password_reset_token
    
    def is_email_verification_valid(self):
        """Check if email verification token is still valid."""
        if not self.email_verification_token or not self.email_verification_expires_at:
            return False
        return timezone.now() < self.email_verification_expires_at
    
    def is_password_reset_valid(self):
        """Check if password reset token is still valid."""
        if not self.password_reset_token or not self.password_reset_expires_at:
            return False
        return timezone.now() < self.password_reset_expires_at

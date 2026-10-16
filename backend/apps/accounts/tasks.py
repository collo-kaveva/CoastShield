from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from django.conf import settings


@shared_task
def cleanup_expired_tokens():
    """Clean up expired email verification and password reset tokens."""
    from .models import User
    
    now = timezone.now()
    
    # Clean up expired email verification tokens
    User.objects.filter(
        email_verification_expires_at__lt=now,
        email_verification_token__ne=""
    ).update(
        email_verification_token="",
        email_verification_expires_at=None
    )
    
    # Clean up expired password reset tokens
    User.objects.filter(
        password_reset_expires_at__lt=now,
        password_reset_token__ne=""
    ).update(
        password_reset_token="",
        password_reset_expires_at=None
    )


@shared_task
def cleanup_deleted_accounts():
    """Permanently delete accounts that have passed the grace period."""
    from .models import User
    
    grace_days = getattr(settings, 'ACCOUNT_DELETION_GRACE_DAYS', 30)
    cutoff = timezone.now() - timedelta(days=grace_days)
    
    # Find users scheduled for deletion
    users_to_delete = User.objects.filter(
        deletion_scheduled_at__lt=cutoff,
        is_active=False
    )
    
    # Delete associated data before deleting user
    for user in users_to_delete:
        # Delete staff assignments
        from .staff import Staff
        Staff.objects.filter(user=user).delete()
        
        # Delete business (cascade will handle related data)
        from apps.businesses.models import BusinessProfile
        BusinessProfile.objects.filter(owner=user).delete()
        
        # Delete user
        user.delete()


@shared_task
def cleanup_old_data():
    """Clean up old data based on retention settings."""
    from apps.audit.models import AuditEvent
    from apps.cybersecurity.models import AnalysisHistory
    
    retention_days = getattr(settings, 'DATA_RETENTION_DAYS', 90)
    cutoff = timezone.now() - timedelta(days=retention_days)
    
    # Clean up old audit events
    AuditEvent.objects.filter(created_at__lt=cutoff).delete()
    
    # Clean up old security analysis history
    AnalysisHistory.objects.filter(created_at__lt=cutoff).delete()

from abc import ABC, abstractmethod
from typing import List, Optional


class NotificationAdapter(ABC):
    """Base class for notification adapters."""
    
    @abstractmethod
    def send(self, recipient: str, subject: str, message: str, **kwargs) -> bool:
        """Send a notification to the recipient."""
        pass


class EmailNotificationAdapter(NotificationAdapter):
    """Email notification adapter using Django Anymail."""
    
    def send(self, recipient: str, subject: str, message: str, **kwargs) -> bool:
        """Send an email notification."""
        try:
            from django.core.mail import send_mail
            from django.conf import settings
            
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [recipient],
                html_message=kwargs.get("html_message"),
                fail_silently=False,
            )
            return True
        except Exception as e:
            # Log error in production
            return False


class SMSNotificationAdapter(NotificationAdapter):
    """SMS notification adapter (placeholder for integration with SMS provider)."""
    
    def send(self, recipient: str, subject: str, message: str, **kwargs) -> bool:
        """Send an SMS notification."""
        # Placeholder for SMS provider integration (e.g., Africa's Talking, Twilio)
        # This would require an SMS provider API key and configuration
        return False


class WhatsAppNotificationAdapter(NotificationAdapter):
    """WhatsApp notification adapter (placeholder for integration with WhatsApp Business API)."""
    
    def send(self, recipient: str, subject: str, message: str, **kwargs) -> bool:
        """Send a WhatsApp notification."""
        # Placeholder for WhatsApp Business API integration
        # This would require WhatsApp Business API credentials
        return False


class NotificationService:
    """Service for sending notifications through multiple channels."""
    
    def __init__(self):
        self.adapters: List[NotificationAdapter] = [
            EmailNotificationAdapter(),
            # SMSNotificationAdapter(),  # Enable when SMS provider is configured
            # WhatsAppNotificationAdapter(),  # Enable when WhatsApp API is configured
        ]
    
    def send(self, recipient: str, subject: str, message: str, channels: Optional[List[str]] = None, **kwargs) -> bool:
        """Send notification through specified channels."""
        success = False
        for adapter in self.adapters:
            if channels is None or adapter.__class__.__name__.replace("NotificationAdapter", "").upper() in channels:
                if adapter.send(recipient, subject, message, **kwargs):
                    success = True
        return success
    
    def send_email_verification(self, user_email: str, verification_url: str) -> bool:
        """Send email verification notification."""
        subject = "Verify your CoastShield account"
        message = f"""
        Please verify your email address by clicking the link below:
        
        {verification_url}
        
        This link will expire in 24 hours.
        
        If you did not create a CoastShield account, please ignore this email.
        """
        html_message = f"""
        <p>Please verify your email address by clicking the link below:</p>
        <p><a href="{verification_url}">Verify Email</a></p>
        <p>This link will expire in 24 hours.</p>
        <p>If you did not create a CoastShield account, please ignore this email.</p>
        """
        return self.send(user_email, subject, message, html_message=html_message)
    
    def send_password_reset(self, user_email: str, reset_url: str) -> bool:
        """Send password reset notification."""
        subject = "Reset your CoastShield password"
        message = f"""
        You requested a password reset for your CoastShield account.
        
        Click the link below to reset your password:
        
        {reset_url}
        
        This link will expire in 1 hour.
        
        If you did not request a password reset, please ignore this email.
        """
        html_message = f"""
        <p>You requested a password reset for your CoastShield account.</p>
        <p>Click the link below to reset your password:</p>
        <p><a href="{reset_url}">Reset Password</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you did not request a password reset, please ignore this email.</p>
        """
        return self.send(user_email, subject, message, html_message=html_message)
    
    def send_staff_invitation(self, user_email: str, business_name: str, invitation_url: str) -> bool:
        """Send staff invitation notification."""
        subject = f"You're invited to join {business_name} on CoastShield"
        message = f"""
        You have been invited to join {business_name} as a staff member on CoastShield.
        
        Click the link below to accept the invitation:
        
        {invitation_url}
        
        This invitation will expire in 7 days.
        """
        html_message = f"""
        <p>You have been invited to join <strong>{business_name}</strong> as a staff member on CoastShield.</p>
        <p>Click the link below to accept the invitation:</p>
        <p><a href="{invitation_url}">Accept Invitation</a></p>
        <p>This invitation will expire in 7 days.</p>
        """
        return self.send(user_email, subject, message, html_message=html_message)

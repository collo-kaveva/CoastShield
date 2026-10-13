import hashlib
import hmac

from django.conf import settings

from .models import AuditEvent

# Metadata keys that must never be stored, even if a caller passes them by mistake.
FORBIDDEN_KEYS = {"password", "token", "secret", "message", "text", "notes", "customer_contact", "customer_name", "email", "phone"}


def _digest(value: str) -> str:
    return hmac.new(settings.SECRET_KEY.encode(), value.encode(), hashlib.sha256).hexdigest()[:12]


def hash_identifier(value: str) -> str:
    """Correlate repeated attempts without storing the raw identifier."""
    return _digest(value.strip().lower())


def client_ip(request):
    if request is None:
        return ""
    return request.META.get("REMOTE_ADDR", "")


def record(action, *, actor=None, target_type="", target_id="", metadata=None, request=None):
    clean = {k: v for k, v in (metadata or {}).items() if k.lower() not in FORBIDDEN_KEYS}
    ip = client_ip(request)
    return AuditEvent.objects.create(
        actor=actor if getattr(actor, "is_authenticated", False) else None,
        action=action, target_type=target_type, target_id=str(target_id),
        metadata=clean, ip_hash=_digest(ip) if ip else "",
    )

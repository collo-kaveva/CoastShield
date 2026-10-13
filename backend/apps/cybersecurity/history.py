import hashlib
import hmac
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from .models import SecurityAnalysis

MAX_PER_USER = 100


def content_hash(text: str) -> str:
    """Keyed hash (not reversible without the server secret). Lets us spot repeats without keeping the text."""
    return hmac.new(settings.SECRET_KEY.encode(), text.encode(), hashlib.sha256).hexdigest()


def record_analysis(user, kind: str, text: str, result: dict) -> SecurityAnalysis:
    """Stores ONLY: kind, risk, indicator id/label/severity (rule-defined) and a keyed hash. Never the text or matched snippets."""
    cutoff = timezone.now() - timedelta(days=settings.ANALYSIS_RETENTION_DAYS)
    SecurityAnalysis.objects.filter(user=user, created_at__lt=cutoff).delete()  # retention enforced on every write
    obj = SecurityAnalysis.objects.create(
        user=user, kind=kind, risk=result["risk"], content_hash=content_hash(text),
        indicators=[{"id": i["id"], "label": i["label"], "severity": i["severity"]} for i in result["indicators"]],
    )
    excess = SecurityAnalysis.objects.filter(user=user).order_by("-created_at").values_list("pk", flat=True)[MAX_PER_USER:]
    if excess:
        SecurityAnalysis.objects.filter(pk__in=list(excess)).delete()
    return obj

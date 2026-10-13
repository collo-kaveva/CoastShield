import uuid

from django.conf import settings
from django.db import models


class SecurityChecklistItem(models.Model):
    """Shared reference content (seeded by migration). Progress is stored per user separately."""
    key = models.SlugField(max_length=40, unique=True)
    group = models.CharField(max_length=60)
    title = models.CharField(max_length=160)
    description = models.CharField(max_length=300)
    position = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["position"]


class UserChecklistProgress(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="checklist_progress")
    item = models.ForeignKey(SecurityChecklistItem, on_delete=models.CASCADE, related_name="+")
    completed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["user", "item"], name="one_progress_per_user_item")]


class SecurityAnalysis(models.Model):
    """History of checks. Minimal by design: the submitted text is NEVER stored, only a keyed hash, the risk level and the rule labels that fired."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="security_analyses")
    kind = models.CharField(max_length=10, choices=[("MESSAGE", "Message"), ("URL", "URL")])
    risk = models.CharField(max_length=10)
    indicators = models.JSONField(default=list)  # [{id, label, severity}] only: rule-defined text, never user content
    content_hash = models.CharField(max_length=64)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "-created_at"])]

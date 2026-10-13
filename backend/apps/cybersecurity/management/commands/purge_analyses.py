from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.cybersecurity.models import SecurityAnalysis


class Command(BaseCommand):
    help = "Delete security-check history older than ANALYSIS_RETENTION_DAYS (or --days). Run daily from cron."

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, default=None)

    def handle(self, *args, **opts):
        days = opts["days"] if opts["days"] is not None else settings.ANALYSIS_RETENTION_DAYS
        n, _ = SecurityAnalysis.objects.filter(created_at__lt=timezone.now() - timedelta(days=days)).delete()
        self.stdout.write(f"Deleted {n} analysis record(s) older than {days} days.")

from rest_framework.generics import ListAPIView

from apps.common.permissions import IsAdminRole

from .models import AuditEvent
from .serializers import AuditEventSerializer


class AuditEventList(ListAPIView):
    """Administrators only. Optional ?action= filter."""
    permission_classes = [IsAdminRole]
    serializer_class = AuditEventSerializer

    def get_queryset(self):
        qs = AuditEvent.objects.all()
        action = self.request.query_params.get("action")
        return qs.filter(action=action) if action else qs

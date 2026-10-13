from django.db import connection
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    """Liveness and database connectivity. Reveals nothing else."""
    try:
        with connection.cursor() as c:
            c.execute("SELECT 1")
        db = "ok"
    except Exception:
        db = "unavailable"
    return Response({"status": "ok" if db == "ok" else "degraded", "database": db}, status=200 if db == "ok" else 503)

from django.db import connection
from django.http import JsonResponse
from django.views.defaults import page_not_found, server_error
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@extend_schema(responses=OpenApiTypes.OBJECT, auth=[])
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


def not_found(request, exception=None):
    """Unknown API URLs get the same structured JSON error as every other API failure (never an HTML page)."""
    if request.path.startswith("/api/"):
        return JsonResponse({"error": {"code": "not_found", "message": "Not found.", "fields": {}}}, status=404)
    return page_not_found(request, exception)


def server_failure(request):
    """Last-resort 500: generic JSON for the API, no details, no stack trace."""
    if request.path.startswith("/api/"):
        return JsonResponse({"error": {"code": "server_error", "message": "Something went wrong on our side. Please try again.", "fields": {}}}, status=500)
    return server_error(request)

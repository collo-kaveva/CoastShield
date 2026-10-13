"""Structured error responses: {"error": {"code", "message", "fields"}}. No stack traces or internals."""
import logging

from django.core.exceptions import PermissionDenied, RequestDataTooBig, SuspiciousOperation
from django.http import Http404
from rest_framework import exceptions, status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_handler

log = logging.getLogger("coastshield.api")

CODES = {
    status.HTTP_400_BAD_REQUEST: "bad_request", status.HTTP_401_UNAUTHORIZED: "not_authenticated",
    status.HTTP_403_FORBIDDEN: "forbidden", status.HTTP_404_NOT_FOUND: "not_found",
    status.HTTP_405_METHOD_NOT_ALLOWED: "method_not_allowed", status.HTTP_409_CONFLICT: "conflict",
    status.HTTP_422_UNPROCESSABLE_ENTITY: "validation_error", status.HTTP_429_TOO_MANY_REQUESTS: "throttled",
}


class Conflict(exceptions.APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "That action conflicts with the current state."
    default_code = "conflict"


def _flatten(detail):
    """Turn DRF's nested error detail into {field: first message}."""
    out = {}
    if isinstance(detail, dict):
        for key, val in detail.items():
            if isinstance(val, (list, tuple)) and val:
                first = val[0]
                out[key] = str(first) if not isinstance(first, dict) else "Invalid value."
            elif isinstance(val, dict):
                out[key] = "Invalid value."
            else:
                out[key] = str(val)
    return out


def exception_handler(exc, context):
    if isinstance(exc, RequestDataTooBig):  # body larger than DATA_UPLOAD_MAX_MEMORY_SIZE
        return Response({"error": {"code": "payload_too_large", "message": "That request is too large.", "fields": {}}}, status=413)
    if isinstance(exc, SuspiciousOperation):  # malformed or tampered input: a client error, never a 500
        return Response({"error": {"code": "bad_request", "message": "That request could not be processed.", "fields": {}}}, status=400)
    if isinstance(exc, Http404):
        exc = exceptions.NotFound()
    elif isinstance(exc, PermissionDenied):
        exc = exceptions.PermissionDenied()

    response = drf_handler(exc, context)
    if response is None:  # unexpected server error: log type only, return nothing sensitive
        log.error("Unhandled API error: %s", type(exc).__name__)
        return Response({"error": {"code": "server_error", "message": "Something went wrong on our side. Please try again.", "fields": {}}}, status=500)

    code = CODES.get(response.status_code, "error")
    fields, message = {}, None
    if isinstance(exc, exceptions.ValidationError):
        fields = _flatten(exc.detail)
        code = "validation_error"
        response.status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
        message = "Please fix the highlighted fields." if fields else None
        if message is None:
            d = exc.detail
            message = str(d[0]) if isinstance(d, list) and d else "Invalid request."
        if "non_field_errors" in fields:
            message = fields.pop("non_field_errors")
    elif isinstance(exc, exceptions.Throttled):
        message = "Too many attempts. Please wait a moment and try again."
    elif isinstance(exc, exceptions.NotAuthenticated):
        message = "Please sign in to continue."
    elif isinstance(exc, exceptions.PermissionDenied):
        message = "You do not have permission to do that."
    elif isinstance(exc, exceptions.NotFound):
        message = "Not found."
    else:
        d = exc.detail if hasattr(exc, "detail") else "Request failed."
        message = str(d)
    if response.status_code == 403 and "CSRF" in str(getattr(exc, "detail", "")):
        code, message = "csrf_failed", "Your session security check failed. Refresh the page and try again."
    response.data = {"error": {"code": code, "message": message, "fields": fields}}
    return response

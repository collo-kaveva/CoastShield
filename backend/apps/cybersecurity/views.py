from django.db import transaction
from rest_framework.generics import ListAPIView
from rest_framework.throttling import ScopedRateThrottle
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers
from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit import services as audit

from . import history
from .incident_content import INCIDENT_GUIDES
from .services import MAX_MESSAGE_LENGTH, MAX_URL_LENGTH, analyze_message, analyze_url

from .models import SecurityAnalysis, SecurityChecklistItem, UserChecklistProgress


def checklist_for(user):
    done = set(UserChecklistProgress.objects.filter(user=user).values_list("item__key", flat=True))
    return [{"key": i.key, "group": i.group, "title": i.title, "description": i.description, "done": i.key in done}
            for i in SecurityChecklistItem.objects.all()]


class ChecklistView(APIView):
    @extend_schema(responses=inline_serializer('ChecklistEntry', {'key': serializers.CharField(), 'group': serializers.CharField(), 'title': serializers.CharField(), 'description': serializers.CharField(), 'done': serializers.BooleanField()}, many=True))
    def get(self, request):
        return Response(checklist_for(request.user))


class ChecklistItemView(APIView):
    class Body(serializers.Serializer):
        done = serializers.BooleanField()

    @extend_schema(request=Body, responses=inline_serializer('ChecklistList', {'key': serializers.CharField(), 'done': serializers.BooleanField()}, many=True))
    def put(self, request, key):
        body = self.Body(data=request.data)
        body.is_valid(raise_exception=True)
        item = SecurityChecklistItem.objects.filter(key=key).first()
        if not item:
            raise NotFound("Unknown checklist item.")
        with transaction.atomic():  # progress is always keyed to request.user: no user id is ever accepted from the client
            if body.validated_data["done"]:
                UserChecklistProgress.objects.get_or_create(user=request.user, item=item)
            else:
                UserChecklistProgress.objects.filter(user=request.user, item=item).delete()
        audit.record("CHECKLIST_CHANGED", actor=request.user, target_type="checklist", target_id=key, metadata={"done": body.validated_data["done"]}, request=request)
        return Response(checklist_for(request.user))


class MessageBody(serializers.Serializer):
    text = serializers.CharField(max_length=MAX_MESSAGE_LENGTH, trim_whitespace=True, error_messages={
        "blank": "Paste a message to check.", "required": "Paste a message to check.", "null": "Paste a message to check.",
        "max_length": f"Message is too long (maximum {MAX_MESSAGE_LENGTH} characters)."})


class UrlBody(serializers.Serializer):
    url = serializers.CharField(max_length=MAX_URL_LENGTH, trim_whitespace=True, error_messages={
        "blank": "Enter a web address to check.", "required": "Enter a web address to check.", "null": "Enter a web address to check.",
        "max_length": f"The address is too long (maximum {MAX_URL_LENGTH} characters)."})


class AnalysisView(APIView):
    """Signed-in owners only, rate limited. The submitted text is analysed in memory and never stored or logged."""
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "analysis"
    body_class = MessageBody
    field = "text"
    kind = "MESSAGE"

    def run(self, value):
        raise NotImplementedError

    def post(self, request):
        body = self.body_class(data=request.data)
        body.is_valid(raise_exception=True)
        value = body.validated_data[self.field]
        result = self.run(value)
        history.record_analysis(request.user, self.kind, value, result)
        audit.record("ANALYSIS_RUN", actor=request.user, target_type="analysis", metadata={"kind": self.kind, "risk": result["risk"]}, request=request)
        return Response(result)


class AnalyzeMessageView(AnalysisView):
    def run(self, value):
        return analyze_message(value)


class CheckUrlView(AnalysisView):
    body_class = UrlBody
    field = "url"
    kind = "URL"

    def run(self, value):
        return analyze_url(value)


class AnalysisHistoryView(ListAPIView):
    """Own history only: kind, risk, rule labels and time. There is no text to return because none is kept."""

    def get_queryset(self):
        return SecurityAnalysis.objects.filter(user=self.request.user)

    def list(self, request, *args, **kwargs):
        page = self.paginate_queryset(self.get_queryset())
        return self.get_paginated_response([
            {"id": str(a.id), "kind": a.kind, "risk": a.risk, "indicators": a.indicators, "createdAt": a.created_at.isoformat()} for a in page])

    def delete(self, request):
        count, _ = SecurityAnalysis.objects.filter(user=request.user).delete()
        audit.record("ANALYSIS_HISTORY_CLEARED", actor=request.user, metadata={"count": count}, request=request)
        return Response(status=204)


class IncidentGuidesView(APIView):
    def get(self, request):
        return Response(INCIDENT_GUIDES)

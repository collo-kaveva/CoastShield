from rest_framework import serializers

from .models import AuditEvent


class AuditEventSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    targetType = serializers.CharField(source="target_type")
    targetId = serializers.CharField(source="target_id")
    actorId = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source="created_at")

    class Meta:
        model = AuditEvent
        fields = ["id", "action", "actorId", "targetType", "targetId", "metadata", "createdAt"]

    def get_actorId(self, obj):
        return str(obj.actor_id) if obj.actor_id else None

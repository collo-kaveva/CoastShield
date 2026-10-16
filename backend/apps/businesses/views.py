from django.db.models import Q
from django.conf import settings
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view, inline_serializer
from rest_framework import serializers, status
from rest_framework.parsers import MultiPartParser
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.exceptions import NotFound
from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit import services as audit
from apps.catalog.models import CatalogItem
from apps.common.errors import Conflict  # noqa: F401
from apps.accounts.permissions import IsBusinessOwner
from rest_framework.exceptions import ValidationError

from .models import BusinessProfile
from .serializers import BusinessSerializer
from .uploads import InvalidImage, process_logo
from .services import missing_for_publish, own_business, public_business, public_item, unique_slug


@extend_schema_view(put=extend_schema(request=BusinessSerializer, responses=BusinessSerializer))
class MyBusinessView(APIView):
    """The signed-in owner's own business only. There is no business ID in the URL to tamper with."""

    @extend_schema(responses=BusinessSerializer)
    def get(self, request):
        b = own_business(request.user)
        if not b:
            raise NotFound("You have not created a business profile yet.")
        return Response(BusinessSerializer(b).data)

    def put(self, request):
        b = own_business(request.user)
        s = BusinessSerializer(b, data=request.data)
        s.is_valid(raise_exception=True)
        if b is None:
            b = s.save(owner=request.user, slug=unique_slug(s.validated_data["name"]))  # slug stays stable after rename
            return Response(BusinessSerializer(b).data, status=status.HTTP_201_CREATED)
        b = s.save()
        return Response(BusinessSerializer(b).data)


class PublishView(APIView):
    publish = True
    permission_classes = [IsAuthenticated, IsBusinessOwner]

    @extend_schema(request=None, responses=BusinessSerializer)
    def post(self, request):
        b = own_business(request.user)
        if not b:
            raise NotFound("Create your business profile first.")
        if self.publish:
            missing = missing_for_publish(b)
            if missing:
                raise ValidationError(f"Add {', '.join(missing)} before publishing.")
            b.status = BusinessProfile.Status.PUBLISHED
        else:
            b.status = BusinessProfile.Status.DRAFT
        b.save(update_fields=["status", "updated_at"])
        audit.record("BUSINESS_PUBLISHED" if self.publish else "BUSINESS_UNPUBLISHED", actor=request.user, target_type="business", target_id=b.id, request=request)
        return Response(BusinessSerializer(b).data)


class StorefrontListView(ListAPIView):
    """Public discovery: published storefronts only."""
    permission_classes = [AllowAny]
    authentication_classes: list = []

    serializer_class = BusinessSerializer

    def get_queryset(self):
        qs = BusinessProfile.objects.filter(status=BusinessProfile.Status.PUBLISHED).order_by("-is_sample", "name")
        cat = self.request.query_params.get("category")
        if cat and cat != "ALL":
            qs = qs.filter(category=cat)
        q = (self.request.query_params.get("q") or "").strip()
        if q:
            qs = qs.filter(Q(name__icontains=q) | Q(town__icontains=q) | Q(county__icontains=q) | Q(description__icontains=q))
        return qs

    @extend_schema(responses=OpenApiTypes.OBJECT, parameters=[OpenApiParameter("category", str), OpenApiParameter("q", str)])
    def list(self, request, *args, **kwargs):
        page = self.paginate_queryset(self.get_queryset())
        return self.get_paginated_response([public_business(b) for b in page])


class StorefrontDetailView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(responses=OpenApiTypes.OBJECT, parameters=[OpenApiParameter("preview", str, description="1 = owner previews their own draft")])
    def get(self, request, slug):
        b = BusinessProfile.objects.filter(slug=slug).first()
        is_owner = bool(b and request.user.is_authenticated and b.owner_id == request.user.id)
        preview = request.query_params.get("preview") == "1"
        # Same 404 for "does not exist" and "is a private draft": drafts cannot be discovered.
        if not b or (b.status != BusinessProfile.Status.PUBLISHED and not (preview and is_owner)):
            raise NotFound("This storefront is not available.")
        items = CatalogItem.objects.filter(business=b).order_by("category", "name")
        return Response({
            "business": public_business(b),
            "items": [public_item(i, b.show_prices) for i in items],
            "isPreview": b.status != BusinessProfile.Status.PUBLISHED,
        })


@extend_schema_view(delete=extend_schema(request=None, responses=BusinessSerializer))
class LogoView(APIView):
    """Owner's own logo only. POST multipart field "logo"; DELETE removes it."""
    parser_classes = [MultiPartParser]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "upload"

    @extend_schema(request={"multipart/form-data": inline_serializer("LogoUpload", {"logo": serializers.ImageField()})}, responses=BusinessSerializer)
    def post(self, request):
        b = own_business(request.user)
        if not b:
            raise NotFound("Create your business profile first.")
        # Refuse obviously oversized bodies before parsing them.
        if int(request.META.get("CONTENT_LENGTH") or 0) > settings.MAX_UPLOAD_BYTES + 64 * 1024:
            return Response({"error": {"code": "payload_too_large", "message": "That image is too large.", "fields": {"logo": "That image is too large."}}}, status=413)
        f = request.FILES.get("logo")
        if f is None:
            raise serializers.ValidationError({"logo": "Choose an image to upload."})
        try:
            processed = process_logo(f)
        except InvalidImage as e:
            raise serializers.ValidationError({"logo": str(e)})
        if b.logo:
            b.logo.delete(save=False)
        b.logo.save(processed.name, processed, save=True)
        audit.record("BUSINESS_LOGO_CHANGED", actor=request.user, target_type="business", target_id=b.id, metadata={"change": "set"}, request=request)
        return Response(BusinessSerializer(b).data)

    def delete(self, request):
        b = own_business(request.user)
        if not b:
            raise NotFound("Create your business profile first.")
        if b.logo:
            b.logo.delete(save=True)
            audit.record("BUSINESS_LOGO_CHANGED", actor=request.user, target_type="business", target_id=b.id, metadata={"change": "removed"}, request=request)
        return Response(BusinessSerializer(b).data)

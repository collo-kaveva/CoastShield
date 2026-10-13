from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers as drf_serializers, status
from rest_framework.exceptions import NotFound
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.businesses.models import BusinessProfile

from . import services
from .models import OrderRequest
from .serializers import LookupSerializer, OrderSerializer, OrderSubmitSerializer, PaymentSerializer, TransitionSerializer


def own_orders(user):
    # Every owner query is scoped by business ownership: other owners' orders simply do not exist for the caller.
    return OrderRequest.objects.filter(business__owner=user).select_related("business").prefetch_related("lines", "events")


class SubmitOrderView(APIView):
    permission_classes = [AllowAny]
    authentication_classes: list = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "order_submit"

    @extend_schema(request=OrderSubmitSerializer, responses={201: inline_serializer('OrderReceipt', {'reference': drf_serializers.CharField(), 'businessName': drf_serializers.CharField(), 'createdAt': drf_serializers.DateTimeField()})})
    def post(self, request, slug):
        # Unknown or unpublished storefronts always answer 404, regardless of the body.
        if not BusinessProfile.objects.filter(slug=slug, status=BusinessProfile.Status.PUBLISHED).exists():
            raise NotFound("This storefront is not available.")
        s = OrderSubmitSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        order = services.create_order(slug, s.validated_data)
        # Customers get back only a reference, never any stored private data.
        return Response({"reference": order.reference, "businessName": order.business.name, "createdAt": order.created_at.isoformat()}, status=status.HTTP_201_CREATED)


class LookupOrderView(APIView):
    permission_classes = [AllowAny]
    authentication_classes: list = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "order_lookup"

    @extend_schema(request=LookupSerializer, responses={200: dict})
    def post(self, request):
        s = LookupSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        o = services.lookup(s.validated_data["reference"], s.validated_data["contact"])
        return Response({
            "reference": o.reference, "businessName": o.business.name, "status": o.status,
            "createdAt": o.created_at.isoformat(), "updatedAt": o.updated_at.isoformat(),
            "items": [{"name": l.name_snapshot, "quantity": l.quantity} for l in o.lines.all()],
        })


class OrderList(ListAPIView):
    serializer_class = OrderSerializer

    def get_queryset(self):
        return own_orders(self.request.user)


class OrderDetail(RetrieveAPIView):
    serializer_class = OrderSerializer

    def get_queryset(self):
        return own_orders(self.request.user)


class TransitionView(APIView):
    @extend_schema(request=TransitionSerializer, responses=OrderSerializer)
    def post(self, request, pk):
        s = TransitionSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        services.transition(pk, request.user, s.validated_data["to"], request)
        return Response(OrderSerializer(own_orders(request.user).get(pk=pk)).data)


class PaymentView(APIView):
    @extend_schema(request=PaymentSerializer, responses=OrderSerializer)
    def post(self, request, pk):
        s = PaymentSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        services.set_payment(pk, request.user, s.validated_data["status"], request)
        return Response(OrderSerializer(own_orders(request.user).get(pk=pk)).data)

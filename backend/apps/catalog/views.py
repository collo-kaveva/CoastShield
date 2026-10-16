from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.generics import GenericAPIView, ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.permissions import IsAuthenticated

from apps.businesses.services import own_business
from apps.accounts.permissions import BusinessObjectPermission

from .models import CatalogItem
from .serializers import CatalogItemSerializer


class OwnItemsMixin:
    serializer_class = CatalogItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Object-level isolation: every query is scoped to the caller's own business.
        return CatalogItem.objects.filter(business__owner=self.request.user)


class ItemListCreate(OwnItemsMixin, ListCreateAPIView):
    def perform_create(self, serializer):
        b = own_business(self.request.user)
        if not b:
            raise NotFound("Create your business profile first.")
        serializer.save(business=b)


class ItemDetail(OwnItemsMixin, RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated, BusinessObjectPermission]
    http_method_names = ["get", "put", "delete", "head", "options"]

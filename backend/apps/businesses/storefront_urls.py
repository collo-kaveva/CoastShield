from django.urls import path
from . import views

urlpatterns = [
    path("", views.StorefrontListView.as_view(), name="storefront-list"),
    path("<slug:slug>/", views.StorefrontDetailView.as_view(), name="storefront-detail"),
]

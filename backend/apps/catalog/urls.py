from django.urls import path
from . import views

urlpatterns = [
    path("items/", views.ItemListCreate.as_view(), name="items"),
    path("items/<uuid:pk>/", views.ItemDetail.as_view(), name="item-detail"),
]

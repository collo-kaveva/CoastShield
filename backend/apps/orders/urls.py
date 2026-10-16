from django.urls import path
from . import views

urlpatterns = [
    path("storefronts/<slug:slug>/orders/", views.SubmitOrderView.as_view(), name="order-submit"),
    path("orders/lookup/", views.LookupOrderView.as_view(), name="order-lookup"),
    path("orders/", views.OrderListView.as_view(), name="orders"),
    path("orders/<uuid:pk>/", views.OrderDetailView.as_view(), name="order-detail"),
    path("orders/<uuid:pk>/transition/", views.TransitionView.as_view(), name="order-transition"),
    path("orders/<uuid:pk>/payment/", views.PaymentView.as_view(), name="order-payment"),
]

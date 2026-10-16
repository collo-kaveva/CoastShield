from django.urls import path
from . import views

urlpatterns = [
    path("initialize/", views.initialize_payment, name="initialize_payment"),
    path("verify/", views.verify_transaction, name="verify_transaction"),
    path("<str:reference>/", views.payment_detail, name="payment_detail"),
    path("<str:reference>/transactions/", views.list_transactions, name="list_transactions"),
    path("refund/", views.initiate_refund_view, name="initiate_refund"),
    path("list/", views.list_payments, name="list_payments"),
    path("webhook/paystack/", views.paystack_webhook, name="paystack_webhook"),
]

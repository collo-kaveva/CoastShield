from django.contrib import admin
from .models import Payment, Transaction, Settlement, Refund


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ["reference", "order", "method", "status", "amount", "created_at"]
    list_filter = ["method", "status", "created_at"]
    search_fields = ["reference", "order__reference"]
    readonly_fields = ["reference", "created_at", "updated_at"]


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ["payment", "provider_reference", "status", "amount", "created_at"]
    list_filter = ["status", "created_at"]
    search_fields = ["provider_reference", "payment__reference"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(Settlement)
class SettlementAdmin(admin.ModelAdmin):
    list_display = ["reference", "business", "amount", "status", "settlement_date"]
    list_filter = ["status", "settlement_date"]
    search_fields = ["reference", "business__name"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(Refund)
class RefundAdmin(admin.ModelAdmin):
    list_display = ["reference", "payment", "amount", "status", "created_at"]
    list_filter = ["status", "created_at"]
    search_fields = ["reference", "payment__reference"]
    readonly_fields = ["created_at", "updated_at"]

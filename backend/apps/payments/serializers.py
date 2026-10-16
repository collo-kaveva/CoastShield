from rest_framework import serializers
from .models import Payment, Transaction, Settlement, Refund


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            "id", "reference", "order", "method", "status", "amount", "currency",
            "customer_email", "customer_name", "metadata", "created_at", "updated_at"
        ]
        read_only_fields = ["id", "reference", "status", "created_at", "updated_at"]


class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = [
            "id", "payment", "provider_reference", "provider", "status", "amount",
            "currency", "fees", "commission", "subaccount_code", "metadata",
            "verified", "verified_at", "created_at", "updated_at"
        ]
        read_only_fields = ["id", "provider_reference", "verified", "verified_at", "created_at", "updated_at"]


class SettlementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Settlement
        fields = [
            "id", "reference", "business", "provider", "status", "amount", "currency",
            "fees", "commission", "net_amount", "settlement_date", "metadata",
            "created_at", "updated_at"
        ]
        read_only_fields = ["id", "reference", "status", "net_amount", "created_at", "updated_at"]


class RefundSerializer(serializers.ModelSerializer):
    class Meta:
        model = Refund
        fields = [
            "id", "reference", "payment", "transaction", "provider_reference",
            "provider", "status", "amount", "currency", "reason", "initiated_by",
            "metadata", "created_at", "updated_at"
        ]
        read_only_fields = ["id", "reference", "provider_reference", "status", "created_at", "updated_at"]


class InitializePaymentSerializer(serializers.Serializer):
    order_id = serializers.UUIDField()
    method = serializers.ChoiceField(choices=Payment.Method.choices)
    email = serializers.EmailField(required=False)
    callback_url = serializers.URLField(required=False)


class VerifyTransactionSerializer(serializers.Serializer):
    reference = serializers.CharField(max_length=100)


class ProcessRefundSerializer(serializers.Serializer):
    payment_id = serializers.UUIDField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    reason = serializers.CharField(required=False, allow_blank=True)

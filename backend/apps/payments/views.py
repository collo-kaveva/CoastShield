import json
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema, extend_schema_field
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.orders.models import OrderRequest
from apps.accounts.permissions import BusinessObjectPermission
from .models import Payment, Transaction, Refund
from .serializers import (
    InitializePaymentSerializer,
    VerifyTransactionSerializer,
    ProcessRefundSerializer,
    PaymentSerializer,
    TransactionSerializer,
    RefundSerializer,
)
from .services import (
    initialize_paystack_payment,
    verify_paystack_transaction,
    process_successful_payment,
    process_cash_on_delivery,
    process_manual_mobile_money,
    initiate_refund,
    verify_webhook_signature,
)


@extend_schema(
    request=InitializePaymentSerializer,
    responses={200: OpenApiTypes.OBJECT},
    description="Initialize a payment for an order. Supports Paystack, cash-on-delivery, and manual mobile money."
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def initialize_payment(request):
    """
    Initialize payment for an order.
    For Paystack: returns authorization URL for hosted checkout.
    For COD/manual: creates payment record and returns reference.
    """
    serializer = InitializePaymentSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    order_id = serializer.validated_data["order_id"]
    method = serializer.validated_data["method"]
    email = serializer.validated_data.get("email")
    callback_url = serializer.validated_data.get("callback_url")
    
    # Get order
    try:
        order = OrderRequest.objects.get(id=order_id)
    except OrderRequest.DoesNotExist:
        return Response({"error": "Order not found"}, status=status.HTTP_404_NOT_FOUND)
    
    # Verify user owns the business
    if order.business.owner_id != request.user.id:
        return Response({"error": "You do not have permission to access this order"}, status=status.HTTP_403_FORBIDDEN)
    
    # Check if payment already exists
    if hasattr(order, 'payment'):
        return Response({"error": "Payment already exists for this order"}, status=status.HTTP_400_BAD_REQUEST)
    
    # Calculate amount from order items
    amount = sum(line.unit_price_snapshot * line.quantity for line in order.lines.all())
    
    try:
        if method == Payment.Method.PAYSTACK:
            if not email:
                return Response({"error": "Email is required for Paystack payments"}, status=status.HTTP_400_BAD_REQUEST)
            
            # Get subaccount code if business has one configured
            subaccount_code = getattr(order.business, 'paystack_subaccount_code', None)
            
            # Initialize with Paystack
            paystack_response = initialize_paystack_payment(
                order=order,
                amount=amount,
                email=email,
                callback_url=callback_url,
                subaccount_code=subaccount_code,
            )
            
            # Create payment record
            from .services import create_payment_record
            payment = create_payment_record(
                order=order,
                method=Payment.Method.PAYSTACK,
                amount=amount,
                customer_email=email,
                customer_name=request.user.name,
            )
            
            # Create transaction record
            from .services import create_transaction_record
            transaction = create_transaction_record(
                payment=payment,
                provider_reference=paystack_response["reference"],
                amount=amount,
                subaccount_code=subaccount_code,
            )
            
            return Response({
                "payment_reference": payment.reference,
                "authorization_url": paystack_response["authorization_url"],
                "access_code": paystack_response["access_code"],
                "reference": paystack_response["reference"],
            })
        
        elif method == Payment.Method.CASH_ON_DELIVERY:
            payment = process_cash_on_delivery(order, amount)
            return Response({
                "payment_reference": payment.reference,
                "status": payment.status,
                "message": "Cash on delivery payment created. Payment will be collected on delivery.",
            })
        
        elif method == Payment.Method.MANUAL_MOBILE_MONEY:
            payment = process_manual_mobile_money(order, amount, customer_name=request.user.name)
            return Response({
                "payment_reference": payment.reference,
                "status": payment.status,
                "message": "Manual mobile money payment created. Business owner will verify payment manually.",
            })
        
        else:
            return Response({"error": "Invalid payment method"}, status=status.HTTP_400_BAD_REQUEST)
    
    except ValueError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({"error": "Failed to initialize payment"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@extend_schema(
    request=VerifyTransactionSerializer,
    responses={200: OpenApiTypes.OBJECT},
    description="Verify a Paystack transaction using the provider API."
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def verify_transaction(request):
    """
    Verify a Paystack transaction by reference.
    This can be called after payment completion to confirm status.
    """
    serializer = VerifyTransactionSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    reference = serializer.validated_data["reference"]
    
    try:
        # Verify with Paystack
        paystack_data = verify_paystack_transaction(reference)
        
        # Process the successful payment
        payment = process_successful_payment(reference, paystack_data)
        
        return Response({
            "status": "success",
            "payment_reference": payment.reference,
            "order_reference": payment.order.reference,
            "amount": str(payment.amount),
            "payment_status": payment.status,
        })
    
    except ValueError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({"error": "Failed to verify transaction"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@extend_schema(
    responses={200: PaymentSerializer},
    description="Get payment details by reference."
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def payment_detail(request, reference):
    """
    Get payment details by reference.
    """
    try:
        payment = Payment.objects.get(reference=reference)
        
        # Verify user owns the business
        if payment.order.business.owner_id != request.user.id:
            return Response({"error": "You do not have permission to access this payment"}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = PaymentSerializer(payment)
        return Response(serializer.data)
    
    except Payment.DoesNotExist:
        return Response({"error": "Payment not found"}, status=status.HTTP_404_NOT_FOUND)


@extend_schema(
    request=ProcessRefundSerializer,
    responses={200: RefundSerializer},
    description="Initiate a refund for a payment."
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def initiate_refund_view(request):
    """
    Initiate a refund for a payment.
    """
    serializer = ProcessRefundSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    payment_id = serializer.validated_data["payment_id"]
    amount = serializer.validated_data["amount"]
    reason = serializer.validated_data.get("reason")
    
    try:
        payment = Payment.objects.get(id=payment_id)
        
        # Verify user owns the business
        if payment.order.business.owner_id != request.user.id:
            return Response({"error": "You do not have permission to refund this payment"}, status=status.HTTP_403_FORBIDDEN)
        
        # Initiate refund
        refund = initiate_refund(
            payment=payment,
            amount=amount,
            reason=reason,
            initiated_by=request.user,
        )
        
        serializer = RefundSerializer(refund)
        return Response(serializer.data)
    
    except Payment.DoesNotExist:
        return Response({"error": "Payment not found"}, status=status.HTTP_404_NOT_FOUND)
    except ValueError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({"error": "Failed to initiate refund"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@extend_schema(
    request=OpenApiTypes.OBJECT,
    responses={200: OpenApiTypes.OBJECT},
    description="Handle Paystack webhook events."
)
@api_view(["POST"])
@permission_classes([AllowAny])
def paystack_webhook(request):
    """
    Handle Paystack webhook events.
    Verifies signature and processes payment success events.
    """
    # Verify webhook signature
    signature = request.headers.get("x-paystack-signature", "")
    payload = request.body
    
    if not verify_webhook_signature(payload, signature):
        return Response({"error": "Invalid signature"}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        event_data = json.loads(payload.decode("utf-8"))
        event = event_data.get("event")
        data = event_data.get("data", {})
        
        # Handle successful payment
        if event == "charge.success":
            reference = data.get("reference")
            try:
                payment = process_successful_payment(reference, data)
                return Response({"status": "success", "payment_reference": payment.reference})
            except ValueError as e:
                # Duplicate or already processed - still return 200 to avoid retries
                return Response({"status": "already_processed", "message": str(e)})
        
        # Handle other events as needed
        return Response({"status": "received"})
    
    except json.JSONDecodeError:
        return Response({"error": "Invalid JSON"}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({"error": "Failed to process webhook"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@extend_schema(
    responses={200: PaymentSerializer(many=True)},
    description="List all payments for the authenticated user's business."
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_payments(request):
    """
    List all payments for the authenticated user's business.
    """
    # Get user's business
    from apps.businesses.models import BusinessProfile
    try:
        business = BusinessProfile.objects.get(owner_id=request.user.id)
    except BusinessProfile.DoesNotExist:
        return Response({"error": "Business profile not found"}, status=status.HTTP_404_NOT_FOUND)
    
    # Get all payments for orders from this business
    payments = Payment.objects.filter(order__business=business).select_related("order").order_by("-created_at")
    
    serializer = PaymentSerializer(payments, many=True)
    return Response(serializer.data)


@extend_schema(
    responses={200: TransactionSerializer(many=True)},
    description="List all transactions for a payment."
)
@api_view(["GET"])
@permission_classes([IsAuthenticated, BusinessObjectPermission])
def list_transactions(request, payment_reference):
    """
    List all transactions for a specific payment.
    """
    try:
        payment = Payment.objects.get(reference=payment_reference)
        
        # Verify user owns the business
        if payment.order.business.owner_id != request.user.id:
            return Response({"error": "You do not have permission to access this payment"}, status=status.HTTP_403_FORBIDDEN)
        
        transactions = payment.transactions.all().order_by("-created_at")
        serializer = TransactionSerializer(transactions, many=True)
        return Response(serializer.data)
    
    except Payment.DoesNotExist:
        return Response({"error": "Payment not found"}, status=status.HTTP_404_NOT_FOUND)

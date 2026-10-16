import secrets
import uuid
from decimal import Decimal
from typing import Optional

import paystack
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .models import Payment, Transaction, Settlement, Refund


def generate_payment_reference() -> str:
    """Generate a unique payment reference."""
    return f"PAY-{secrets.token_urlsafe(16).upper()[:16]}"


def generate_refund_reference() -> str:
    """Generate a unique refund reference."""
    return f"REF-{secrets.token_urlsafe(16).upper()[:16]}"


def get_paystack_client():
    """Get configured Paystack client."""
    secret_key = settings.PAYSTACK_SECRET_KEY
    if not secret_key:
        raise ValueError("PAYSTACK_SECRET_KEY not configured")
    return paystackapi.Paystack(secret_key=secret_key)


def initialize_paystack_payment(
    order,
    amount: Decimal,
    email: str,
    callback_url: Optional[str] = None,
    subaccount_code: Optional[str] = None,
) -> dict:
    """
    Initialize a Paystack transaction.
    Returns the Paystack response with authorization URL and reference.
    """
    client = get_paystack_client()
    
    # Calculate commission if configured
    commission_percent = getattr(settings, 'PLATFORM_COMMISSION_PERCENT', 0)
    commission = Decimal(str(commission_percent / 100)) * amount if commission_percent > 0 else Decimal('0')
    
    # Prepare transaction data
    transaction_data = {
        "email": email,
        "amount": int(amount * 100),  # Paystack expects amount in kobo/cents
        "currency": "KES",
        "reference": generate_payment_reference(),
        "metadata": {
            "order_id": str(order.id),
            "order_reference": order.reference,
            "custom_fields": [
                {
                    "display_name": "Order Reference",
                    "variable_name": "order_reference",
                    "value": order.reference,
                }
            ],
        },
    }
    
    if callback_url:
        transaction_data["callback_url"] = callback_url
    
    if subaccount_code:
        transaction_data["subaccount"] = subaccount_code
        # Add split configuration if commission is set
        if commission > 0:
            transaction_data["split"] = {
                "type": "percentage",
                "bearer_type": "account",
                "subaccount": subaccount_code,
                "share": {
                    subaccount_code: float(100 - commission_percent),
                    # Platform share would go to main account
                }
            }
    
    # Initialize transaction with Paystack
    response = client.transaction.initialize(**transaction_data)
    
    if not response.get("status"):
        raise ValueError(f"Paystack initialization failed: {response.get('message', 'Unknown error')}")
    
    return response["data"]


def verify_paystack_transaction(reference: str) -> dict:
    """
    Verify a Paystack transaction using the provider API.
    Returns the verified transaction data.
    """
    client = get_paystack_client()
    response = client.transaction.verify(reference)
    
    if not response.get("status"):
        raise ValueError(f"Paystack verification failed: {response.get('message', 'Unknown error')}")
    
    return response["data"]


def create_payment_record(
    order,
    method: str,
    amount: Decimal,
    customer_email: Optional[str] = None,
    customer_name: Optional[str] = None,
) -> Payment:
    """
    Create a payment record for an order.
    Prevents duplicate payments for the same order.
    """
    # Check if payment already exists for this order
    if hasattr(order, 'payment'):
        raise ValueError("Payment already exists for this order")
    
    payment = Payment.objects.create(
        reference=generate_payment_reference(),
        order=order,
        method=method,
        amount=amount,
        customer_email=customer_email or "",
        customer_name=customer_name or "",
    )
    
    return payment


def create_transaction_record(
    payment: Payment,
    provider_reference: str,
    amount: Decimal,
    fees: Decimal = Decimal('0'),
    commission: Decimal = Decimal('0'),
    subaccount_code: Optional[str] = None,
) -> Transaction:
    """
    Create a transaction record for a payment.
    """
    transaction = Transaction.objects.create(
        payment=payment,
        provider_reference=provider_reference,
        amount=amount,
        fees=fees,
        commission=commission,
        subaccount_code=subaccount_code or "",
    )
    
    return transaction


@transaction.atomic
def process_successful_payment(provider_reference: str, paystack_data: dict) -> Payment:
    """
    Process a successful payment from Paystack webhook or verification.
    Updates payment status, creates transaction record, and updates order status.
    Prevents duplicate processing using database transaction and idempotency checks.
    """
    # Check if transaction already processed
    if Transaction.objects.filter(provider_reference=provider_reference, verified=True).exists():
        raise ValueError("Transaction already processed")
    
    # Extract order reference from metadata
    metadata = paystack_data.get("metadata", {})
    order_reference = metadata.get("order_reference")
    
    if not order_reference:
        raise ValueError("Order reference not found in transaction metadata")
    
    # Get order
    from apps.orders.models import OrderRequest
    try:
        order = OrderRequest.objects.get(reference=order_reference)
    except OrderRequest.DoesNotExist:
        raise ValueError(f"Order {order_reference} not found")
    
    # Get or create payment record
    payment, created = Payment.objects.get_or_create(
        order=order,
        defaults={
            "reference": generate_payment_reference(),
            "method": Payment.Method.PAYSTACK,
            "amount": Decimal(str(paystack_data["amount"])) / 100,  # Convert from kobo
            "customer_email": paystack_data.get("customer", {}).get("email", ""),
            "customer_name": paystack_data.get("customer", {}).get("first_name", "") + " " + paystack_data.get("customer", {}).get("last_name", ""),
            "status": Payment.Status.PROCESSING,
        }
    )
    
    if not created and payment.status == Payment.Status.COMPLETED:
        raise ValueError("Payment already completed")
    
    # Calculate fees and commission
    fees = Decimal(str(paystack_data.get("fees", 0))) / 100  # Convert from kobo
    commission_percent = getattr(settings, 'PLATFORM_COMMISSION_PERCENT', 0)
    commission = Decimal(str(commission_percent / 100)) * payment.amount if commission_percent > 0 else Decimal('0')
    
    # Create transaction record
    subaccount_code = paystack_data.get("subaccount", {}).get("subaccount_code")
    transaction = create_transaction_record(
        payment=payment,
        provider_reference=provider_reference,
        amount=payment.amount,
        fees=fees,
        commission=commission,
        subaccount_code=subaccount_code,
    )
    
    # Mark transaction as verified
    transaction.verified = True
    transaction.verified_at = timezone.now()
    transaction.status = Transaction.Status.SUCCESS
    transaction.save()
    
    # Update payment status
    payment.status = Payment.Status.COMPLETED
    payment.save()
    
    # Update order payment status
    order.payment_status = OrderRequest.Payment.PAID
    order.save()
    
    return payment


@transaction.atomic
def process_cash_on_delivery(order, amount: Decimal) -> Payment:
    """
    Create a cash-on-delivery payment record.
    Payment status remains PENDING until delivery completion.
    """
    payment = create_payment_record(
        order=order,
        method=Payment.Method.CASH_ON_DELIVERY,
        amount=amount,
    )
    
    payment.status = Payment.Status.PENDING
    payment.save()
    
    return payment


@transaction.atomic
def process_manual_mobile_money(
    order,
    amount: Decimal,
    customer_name: Optional[str] = None,
) -> Payment:
    """
    Create a manual mobile money payment record.
    Payment status remains PENDING until manual verification by business owner.
    """
    payment = create_payment_record(
        order=order,
        method=Payment.Method.MANUAL_MOBILE_MONEY,
        amount=amount,
        customer_name=customer_name,
    )
    
    payment.status = Payment.Status.PENDING
    payment.save()
    
    return payment


@transaction.atomic
def initiate_refund(
    payment: Payment,
    amount: Decimal,
    reason: Optional[str] = None,
    initiated_by=None,
) -> Refund:
    """
    Initiate a refund for a payment.
    """
    if payment.status != Payment.Status.COMPLETED:
        raise ValueError("Can only refund completed payments")
    
    if payment.refunds.filter(status__in=[Refund.Status.PENDING, Refund.Status.PROCESSING]).exists():
        raise ValueError("A refund is already in progress for this payment")
    
    refund = Refund.objects.create(
        reference=generate_refund_reference(),
        payment=payment,
        amount=amount,
        reason=reason or "",
        initiated_by=initiated_by,
        status=Refund.Status.PENDING,
    )
    
    # If payment was via Paystack, initiate refund with provider
    if payment.method == Payment.Method.PAYSTACK:
        transaction = payment.transactions.filter(status=Transaction.Status.SUCCESS).first()
        if transaction:
            try:
                client = get_paystack_client()
                response = client.refund.create(
                    transaction=transaction.provider_reference,
                    amount=int(amount * 100),  # Convert to kobo
                )
                
                if response.get("status"):
                    refund.provider_reference = response["data"].get("reference")
                    refund.status = Refund.Status.PROCESSING
                    refund.save()
            except Exception as e:
                # Log error but don't fail - refund can be processed manually
                pass
    
    return refund


def verify_webhook_signature(payload: bytes, signature: str) -> bool:
    """
    Verify Paystack webhook signature.
    """
    import hmac
    import hashlib
    
    webhook_secret = settings.PAYSTACK_WEBHOOK_SECRET
    if not webhook_secret:
        # If no secret configured, skip verification (not recommended for production)
        return True
    
    computed_signature = hmac.new(
        webhook_secret.encode(),
        payload,
        hashlib.sha512,
    ).hexdigest()
    
    return hmac.compare_digest(computed_signature, signature)

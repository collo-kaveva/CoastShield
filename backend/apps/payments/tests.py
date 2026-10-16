import pytest
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from decimal import Decimal
from unittest.mock import Mock, patch, MagicMock
import hmac
import hashlib

from .models import Payment, Transaction, Settlement, Refund
from .services import (
    generate_payment_reference,
    generate_refund_reference,
    verify_webhook_signature,
    create_payment_record,
    create_transaction_record,
    process_cash_on_delivery,
    process_manual_mobile_money,
)
from .views import initialize_payment, verify_transaction, paystack_webhook

User = get_user_model()


class PaymentReferenceTests(TestCase):
    """Test payment reference generation."""

    def test_generate_payment_reference(self):
        """Payment reference should be unique and start with PAY-."""
        ref1 = generate_payment_reference()
        ref2 = generate_payment_reference()
        
        self.assertTrue(ref1.startswith("PAY-"))
        self.assertTrue(ref2.startswith("PAY-"))
        self.assertNotEqual(ref1, ref2)
        self.assertEqual(len(ref1), 20)  # PAY- + 16 chars

    def test_generate_refund_reference(self):
        """Refund reference should be unique and start with REF-."""
        ref1 = generate_refund_reference()
        ref2 = generate_refund_reference()
        
        self.assertTrue(ref1.startswith("REF-"))
        self.assertTrue(ref2.startswith("REF-"))
        self.assertNotEqual(ref1, ref2)
        self.assertEqual(len(ref1), 20)  # REF- + 16 chars


class WebhookSignatureTests(TestCase):
    """Test webhook signature verification."""

    def test_verify_webhook_signature_valid(self):
        """Valid signature should pass verification."""
        payload = b'{"event": "charge.success", "data": {}}'
        secret = "test_secret"
        
        signature = hmac.new(
            secret.encode(),
            payload,
            hashlib.sha512,
        ).hexdigest()
        
        with override_settings(PAYSTACK_WEBHOOK_SECRET=secret):
            result = verify_webhook_signature(payload, signature)
            self.assertTrue(result)

    def test_verify_webhook_signature_invalid(self):
        """Invalid signature should fail verification."""
        payload = b'{"event": "charge.success", "data": {}}'
        secret = "test_secret"
        
        wrong_signature = "wrong_signature"
        
        with override_settings(PAYSTACK_WEBHOOK_SECRET=secret):
            result = verify_webhook_signature(payload, wrong_signature)
            self.assertFalse(result)

    def test_verify_webhook_signature_no_secret(self):
        """Without secret configured, should return True (skip verification)."""
        payload = b'{"event": "charge.success", "data": {}}'
        signature = "any_signature"
        
        with override_settings(PAYSTACK_WEBHOOK_SECRET=None):
            result = verify_webhook_signature(payload, signature)
            self.assertTrue(result)


class PaymentRecordTests(TestCase):
    """Test payment record creation."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            email="test@example.com",
            name="Test User",
            password="testpass123"
        )
        
        from apps.businesses.models import BusinessProfile
        self.business = BusinessProfile.objects.create(
            owner=self.user,
            name="Test Business",
            category="RETAIL_MARKET",
            county="Nairobi",
            town="Nairobi",
            public_address="123 Test St",
            phone="+254712345678",
            whatsapp="+254712345678",
            email="business@example.com",
            slug="test-business",
            status="PUBLISHED",
        )
        
        from apps.orders.models import OrderRequest
        self.order = OrderRequest.objects.create(
            business=self.business,
            customer_name="Customer",
            customer_contact="customer@example.com",
            notes="Test order",
            reference="ORD-TEST",
            status="NEW",
        )

    def test_create_payment_record(self):
        """Payment record should be created successfully."""
        payment = create_payment_record(
            order=self.order,
            method=Payment.Method.PAYSTACK,
            amount=Decimal("100.00"),
            customer_email="customer@example.com",
            customer_name="Customer",
        )
        
        self.assertEqual(payment.order, self.order)
        self.assertEqual(payment.method, Payment.Method.PAYSTACK)
        self.assertEqual(payment.amount, Decimal("100.00"))
        self.assertEqual(payment.status, Payment.Status.PENDING)
        self.assertEqual(payment.currency, "KES")
        self.assertTrue(payment.reference.startswith("PAY-"))

    def test_create_transaction_record(self):
        """Transaction record should be created successfully."""
        payment = create_payment_record(
            order=self.order,
            method=Payment.Method.PAYSTACK,
            amount=Decimal("100.00"),
            customer_email="customer@example.com",
            customer_name="Customer",
        )
        
        transaction = create_transaction_record(
            payment=payment,
            provider_reference="paystack_ref_123",
            amount=Decimal("100.00"),
            subaccount_code="sub_123",
        )
        
        self.assertEqual(transaction.payment, payment)
        self.assertEqual(transaction.provider_reference, "paystack_ref_123")
        self.assertEqual(transaction.amount, Decimal("100.00"))
        self.assertEqual(transaction.status, Transaction.Status.PENDING)
        self.assertEqual(transaction.subaccount_code, "sub_123")


class CashOnDeliveryTests(TestCase):
    """Test cash on delivery payment processing."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            email="test@example.com",
            name="Test User",
            password="testpass123"
        )
        
        from apps.businesses.models import BusinessProfile
        self.business = BusinessProfile.objects.create(
            owner=self.user,
            name="Test Business",
            category="RETAIL_MARKET",
            county="Nairobi",
            town="Nairobi",
            public_address="123 Test St",
            phone="+254712345678",
            whatsapp="+254712345678",
            email="business@example.com",
            slug="test-business",
            status="PUBLISHED",
        )
        
        from apps.orders.models import OrderRequest
        self.order = OrderRequest.objects.create(
            business=self.business,
            customer_name="Customer",
            customer_contact="customer@example.com",
            notes="Test order",
            reference="ORD-TEST",
            status="NEW",
        )

    def test_process_cash_on_delivery(self):
        """Cash on delivery payment should be created with correct status."""
        payment = process_cash_on_delivery(
            order=self.order,
            amount=Decimal("100.00"),
        )
        
        self.assertEqual(payment.order, self.order)
        self.assertEqual(payment.method, Payment.Method.CASH_ON_DELIVERY)
        self.assertEqual(payment.amount, Decimal("100.00"))
        self.assertEqual(payment.status, Payment.Status.PENDING)
        self.assertEqual(payment.currency, "KES")


class ManualMobileMoneyTests(TestCase):
    """Test manual mobile money payment processing."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            email="test@example.com",
            name="Test User",
            password="testpass123"
        )
        
        from apps.businesses.models import BusinessProfile
        self.business = BusinessProfile.objects.create(
            owner=self.user,
            name="Test Business",
            category="RETAIL_MARKET",
            county="Nairobi",
            town="Nairobi",
            public_address="123 Test St",
            phone="+254712345678",
            whatsapp="+254712345678",
            email="business@example.com",
            slug="test-business",
            status="PUBLISHED",
        )
        
        from apps.orders.models import OrderRequest
        self.order = OrderRequest.objects.create(
            business=self.business,
            customer_name="Customer",
            customer_contact="customer@example.com",
            notes="Test order",
            reference="ORD-TEST",
            status="NEW",
        )

    def test_process_manual_mobile_money(self):
        """Manual mobile money payment should be created with correct status."""
        payment = process_manual_mobile_money(
            order=self.order,
            amount=Decimal("100.00"),
            customer_name="Customer",
        )
        
        self.assertEqual(payment.order, self.order)
        self.assertEqual(payment.method, Payment.Method.MANUAL_MOBILE_MONEY)
        self.assertEqual(payment.amount, Decimal("100.00"))
        self.assertEqual(payment.status, Payment.Status.PENDING)
        self.assertEqual(payment.currency, "KES")


class PaymentInitializationTests(TestCase):
    """Test payment initialization API."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            email="test@example.com",
            name="Test User",
            password="testpass123"
        )
        
        from apps.businesses.models import BusinessProfile
        self.business = BusinessProfile.objects.create(
            owner=self.user,
            name="Test Business",
            category="RETAIL_MARKET",
            county="Nairobi",
            town="Nairobi",
            public_address="123 Test St",
            phone="+254712345678",
            whatsapp="+254712345678",
            email="business@example.com",
            slug="test-business",
            status="PUBLISHED",
        )
        
        from apps.orders.models import OrderRequest
        self.order = OrderRequest.objects.create(
            business=self.business,
            customer_name="Customer",
            customer_contact="customer@example.com",
            notes="Test order",
            reference="ORD-TEST",
            status="NEW",
        )
        
        from apps.orders.models import OrderItem
        OrderItem.objects.create(
            order=self.order,
            name_snapshot="Test Item",
            unit_price_snapshot=Decimal("50.00"),
            quantity=2,
        )

    def test_initialize_cash_on_delivery(self):
        """Cash on delivery initialization should create payment."""
        from rest_framework.test import APIRequestFactory
        from rest_framework.test import force_authenticate
        
        factory = APIRequestFactory()
        request = factory.post(
            '/api/v1/payments/initialize/',
            {
                'order_id': str(self.order.id),
                'method': Payment.Method.CASH_ON_DELIVERY,
            },
            format='json'
        )
        force_authenticate(request, user=self.user)
        
        response = initialize_payment(request)
        
        self.assertEqual(response.status_code, 200)
        data = response.data
        self.assertIn('payment_reference', data)
        self.assertEqual(data['status'], 'PENDING')
        
        # Verify payment was created
        payment = Payment.objects.get(order=self.order)
        self.assertEqual(payment.method, Payment.Method.CASH_ON_DELIVERY)

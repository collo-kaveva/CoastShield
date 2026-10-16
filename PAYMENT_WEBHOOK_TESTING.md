# Paystack Webhook Testing Guide

This document explains how to test Paystack webhooks locally using ngrok or similar tunneling services.

## Overview

Paystack webhooks are HTTP POST requests sent to your server when payment events occur (e.g., successful charge, refund, transfer). Since Paystack needs to reach your server, you must expose your local development environment to the internet.

## Prerequisites

1. **Paystack Test Account**: Sign up at [paystack.co](https://paystack.co) and get test API keys
2. **ngrok**: Download from [ngrok.com](https://ngrok.com) (free tier is sufficient)
3. **Backend Running**: Ensure Django backend is running locally

## Setup Steps

### 1. Configure Environment Variables

Add to your `.env` file:

```bash
PAYSTACK_SECRET_KEY=sk_test_...
PAYSTACK_PUBLIC_KEY=pk_test_...
PAYSTACK_TEST_MODE=True
PAYSTACK_WEBHOOK_SECRET=your_webhook_secret_from_paystack
PLATFORM_COMMISSION_PERCENT=0
```

### 2. Start ngrok

```bash
ngrok http 8000
```

This will output a public URL like: `https://abc123.ngrok.io`

### 3. Configure Paystack Webhook

1. Log into Paystack dashboard
2. Go to Settings → Webhooks
3. Add new webhook URL: `https://abc123.ngrok.io/api/v1/payments/webhook/paystack/`
4. Select events to listen for (at minimum: `charge.success`)
5. Copy the webhook secret and add to `PAYSTACK_WEBHOOK_SECRET` in `.env`

### 4. Start Django Backend

```bash
cd backend
source venv/bin/activate
python manage.py runserver
```

The backend will now receive webhook events from Paystack.

## Testing Webhook Events

### Method 1: Simulate Webhook via Paystack Dashboard

1. Go to Paystack Dashboard → Developers → Webhooks
2. Find your webhook and click "View details"
3. Click "Send test webhook" to send a sample `charge.success` event
4. Check your Django logs for webhook processing

### Method 2. Use curl to Test Webhook Endpoint

```bash
# Generate a test signature
PAYSTACK_SECRET="your_webhook_secret"
PAYLOAD='{"event":"charge.success","data":{"reference":"test_ref","amount":10000,"currency":"KES","status":"success"}}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha512 -hmac "$PAYSTACK_SECRET" -binary | xxd -p -c 256)

# Send test webhook
curl -X POST https://abc123.ngrok.io/api/v1/payments/webhook/paystack/ \
  -H "Content-Type: application/json" \
  -H "x-paystack-signature: $SIGNATURE" \
  -d "$PAYLOAD"
```

### Method 3. Test with Paystack Test Mode

1. Initialize a real payment via the frontend or API
2. Use Paystack test card: `4084 0840 0840 0840` (any future date, any CVV)
3. Complete the payment in the hosted checkout
4. Paystack will automatically send the webhook to your ngrok URL
5. Verify payment status updates in your database

## Webhook Event Types

### charge.success
Sent when a payment is successfully completed. This is the most important event for CoastShield.

**Payload structure:**
```json
{
  "event": "charge.success",
  "data": {
    "reference": "paystack_reference",
    "amount": 10000,
    "currency": "KES",
    "status": "success",
    "customer": {
      "email": "customer@example.com"
    },
    "metadata": {
      "order_id": "uuid",
      "order_reference": "ORD-XXX"
    }
  }
}
```

### Other Events (for future implementation)
- `charge.failed` - Payment failed
- `transfer.success` - Transfer completed
- `transfer.failed` - Transfer failed
- `refund.processed` - Refund processed

## Debugging Webhook Issues

### Check Django Logs

```bash
# Run with verbose logging
python manage.py runserver --verbosity=2
```

### Verify Signature Calculation

The webhook signature is calculated as:
```python
import hmac
import hashlib

signature = hmac.new(
    PAYSTACK_WEBHOOK_SECRET.encode(),
    request.body,
    hashlib.sha512,
).hexdigest()
```

### Common Issues

1. **Invalid Signature**: Ensure `PAYSTACK_WEBHOOK_SECRET` matches Paystack dashboard exactly
2. **404 Error**: Check webhook URL path is correct: `/api/v1/payments/webhook/paystack/`
3. **Timeout**: ngrok free tier may timeout; restart ngrok if needed
4. **Duplicate Events**: Webhook endpoint handles duplicates gracefully (returns 200)

## Security Notes

- **Never expose webhook secrets** in frontend code or public repositories
- **Always verify signatures** in production (the code does this automatically)
- **Use HTTPS** in production (ngrok provides HTTPS automatically)
- **Rate limit webhook endpoints** if expecting high volume

## Production Deployment

For production:

1. Use your live Paystack API keys
2. Set `PAYSTACK_TEST_MODE=False`
3. Configure webhook URL to your production domain
4. Ensure HTTPS is enabled
5. Set up proper monitoring for webhook failures
6. Implement retry logic for failed webhook processing

## Testing Checklist

- [ ] ngrok tunnel running
- [ ] Django backend accessible via ngrok
- [ ] Webhook URL configured in Paystack dashboard
- [ ] Webhook secret added to `.env`
- [ ] Test webhook sent successfully
- [ ] Payment status updates in database
- [ ] Order status updates correctly
- [ ] Transaction record created
- [ ] Commission calculated (if applicable)

## Troubleshooting

### Webhook not received
- Check ngrok is running
- Verify webhook URL in Paystack dashboard
- Check Django logs for errors
- Ensure firewall allows inbound connections

### Signature verification fails
- Verify `PAYSTACK_WEBHOOK_SECRET` matches Paystack
- Check for extra whitespace in secret
- Ensure raw request body is used (not parsed JSON)

### Payment not updated
- Check payment reference matches webhook data
- Verify order exists in database
- Check Django transaction logs
- Review webhook processing in `services.py`

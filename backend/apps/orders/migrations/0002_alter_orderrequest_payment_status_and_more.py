# Generated migration for payment status and method fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="orderrequest",
            name="payment_status",
            field=models.CharField(
                choices=[("UNPAID", "Unpaid"), ("PENDING", "Pending"), ("PAID", "Paid"), ("FAILED", "Failed")],
                default="UNPAID",
                max_length=6,
            ),
        ),
        migrations.AddField(
            model_name="orderrequest",
            name="payment_method",
            field=models.CharField(
                blank=True,
                help_text="Payment method used (PAYSTACK, CASH_ON_DELIVERY, MANUAL_MOBILE_MONEY)",
                max_length=30,
            ),
        ),
    ]

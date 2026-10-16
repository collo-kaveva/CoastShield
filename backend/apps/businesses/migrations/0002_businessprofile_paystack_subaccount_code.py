# Generated migration for paystack_subaccount_code field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("businesses", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="businessprofile",
            name="paystack_subaccount_code",
            field=models.CharField(blank=True, help_text="Paystack subaccount code for transaction splitting", max_length=100),
        ),
    ]

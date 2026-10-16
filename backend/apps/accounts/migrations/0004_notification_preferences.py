# Generated migration for NotificationPreference model

from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0003_staff"),
    ]

    operations = [
        migrations.CreateModel(
            name="NotificationPreference",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("channel", models.CharField(choices=[("EMAIL", "Email"), ("SMS", "SMS"), ("WHATSAPP", "WhatsApp")], default="EMAIL", max_length=10)),
                ("event_types", models.JSONField(default=list, help_text="List of event types the user wants to receive")),
                ("enabled", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="notification_preferences", to="accounts.user")),
            ],
            options={
                "indexes": [
                    models.Index(fields=["user"], name="notification_pref_user_idx"),
                ],
            },
        ),
    ]

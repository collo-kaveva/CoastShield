# Generated migration for Staff model

from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0002_user_mfa_and_verification"),
        ("businesses", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Staff",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("role", models.CharField(choices=[("MANAGER", "Manager - Full access to business operations"), ("SALES", "Sales - Can manage orders and customers"), ("INVENTORY", "Inventory - Can manage catalog and stock"), ("VIEWER", "Viewer - Read-only access")], default="VIEWER", max_length=20)),
                ("status", models.CharField(choices=[("PENDING", "Pending invitation"), ("ACTIVE", "Active"), ("SUSPENDED", "Suspended"), ("DELETED", "Deleted")], default="PENDING", max_length=20)),
                ("invitation_token", models.CharField(blank=True, db_index=True, max_length=64)),
                ("invitation_expires_at", models.DateTimeField(blank=True, null=True)),
                ("invited_at", models.DateTimeField(auto_now_add=True)),
                ("accepted_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("business", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="staff", to="businesses.businessprofile")),
                ("invited_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="invited_staff", to="accounts.user")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="staff_assignments", to="accounts.user")),
            ],
            options={
                "ordering": ["-created_at"],
                "indexes": [
                    models.Index(fields=["business", "status"], name="staff_business_status_idx"),
                    models.Index(fields=["user", "business"], name="staff_user_business_idx"),
                    models.Index(fields=["invitation_token"], name="staff_invitation_token_idx"),
                ],
                "unique_together": {("business", "user")},
            },
        ),
    ]

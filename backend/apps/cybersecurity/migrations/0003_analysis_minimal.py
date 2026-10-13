from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("cybersecurity", "0002_seed_checklist")]
    operations = [
        migrations.RenameField("securityanalysis", "indicator_ids", "indicators"),
        migrations.AddIndex("securityanalysis", models.Index(fields=["user", "-created_at"], name="cybersecuri_user_id_3c06b9_idx")),
    ]

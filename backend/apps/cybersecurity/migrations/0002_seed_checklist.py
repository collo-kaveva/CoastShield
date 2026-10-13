from django.db import migrations

from apps.cybersecurity.checklist_data import CHECKLIST_ITEMS


def seed(apps, schema_editor):
    Item = apps.get_model("cybersecurity", "SecurityChecklistItem")
    for pos, (key, group, title, desc) in enumerate(CHECKLIST_ITEMS):
        Item.objects.update_or_create(key=key, defaults={"group": group, "title": title, "description": desc, "position": pos})


class Migration(migrations.Migration):
    dependencies = [("cybersecurity", "0001_initial")]
    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]

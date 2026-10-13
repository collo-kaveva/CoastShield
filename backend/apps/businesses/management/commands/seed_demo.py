from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User
from apps.businesses.models import BusinessProfile
from apps.catalog.models import CatalogItem
from apps.cybersecurity.models import SecurityChecklistItem, UserChecklistProgress
from apps.orders.models import OrderEvent, OrderItem, OrderRequest
from apps.orders.services import LABEL

from apps.businesses import sample_data as d


class Command(BaseCommand):
    help = "Load clearly-labelled SAMPLE businesses and a demo owner account. Use --reset to remove them first."

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true", help="Delete all sample data (and the demo account) before loading.")
        parser.add_argument("--remove-only", action="store_true", help="Delete sample data and exit.")

    @transaction.atomic
    def handle(self, *args, **opts):
        if opts["reset"] or opts["remove_only"]:
            BusinessProfile.objects.filter(is_sample=True).delete()  # cascades items and orders
            User.objects.filter(email=d.DEMO_EMAIL).delete()
            self.stdout.write("Removed existing sample data.")
            if opts["remove_only"]:
                return
        if User.objects.filter(email=d.DEMO_EMAIL).exists():
            self.stdout.write("Sample data already present. Use --reset to reload it.")
            return

        for slug, name, cat, county, town, desc, phone, prices, items in d.SAMPLES:
            b = BusinessProfile.objects.create(owner=None, name=name, slug=slug, category=cat, description=desc, county=county, town=town,
                                               phone=phone, show_phone=True, show_prices=prices, hours=d.HOURS("08:00", "17:00"),
                                               status="PUBLISHED", is_sample=True)
            for n, de, price, grp, avail in items:
                CatalogItem.objects.create(business=b, name=n, description=de, price=price, category=grp, available=avail)

        user = User.objects.create_user(email=d.DEMO_EMAIL, password=d.DEMO_PASSWORD, name=d.DEMO_NAME)
        biz = BusinessProfile.objects.create(owner=user, status="PUBLISHED", is_sample=True, **d.DEMO_BUSINESS)
        items = {}
        for key, n, de, price, grp, extra in d.DEMO_ITEMS:
            items[key] = CatalogItem.objects.create(business=biz, name=n, description=de, price=price, category=grp, **extra)
        now = timezone.now()
        for ref, cust, contact, notes, lines, chain, paid, mins in d.DEMO_ORDERS:
            o = OrderRequest.objects.create(business=biz, reference=ref, customer_name=cust, customer_contact=contact, notes=notes,
                                            status=chain[-1], payment_status="PAID" if paid else "UNPAID")
            OrderRequest.objects.filter(pk=o.pk).update(created_at=now - timedelta(minutes=mins))
            for key, qty in lines:
                it = items[key]
                OrderItem.objects.create(order=o, item=it, name_snapshot=it.name, unit_price_snapshot=it.price, quantity=qty)
            for i, st in enumerate(chain):
                ev = OrderEvent.objects.create(order=o, label="Request received" if st == "NEW" else f"Status changed to {LABEL[st]}")
                OrderEvent.objects.filter(pk=ev.pk).update(created_at=now - timedelta(minutes=max(mins - i * 20, 1)))
        for key in d.DEMO_CHECKLIST:
            UserChecklistProgress.objects.create(user=user, item=SecurityChecklistItem.objects.get(key=key))
        self.stdout.write(self.style.SUCCESS(f"Loaded {len(d.SAMPLES) + 1} sample businesses. Demo login: {d.DEMO_EMAIL} / {d.DEMO_PASSWORD} (SAMPLE ONLY)."))

from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cybersecurity.models import SecurityChecklistItem, UserChecklistProgress
from apps.orders.serializers import OrderSerializer
from apps.orders.views import own_orders

from .serializers import BusinessSerializer
from .services import own_business


def completion(b):
    if not b:
        return {"percent": 0, "missing": ["business profile"]}
    checks = [
        (len(b.name.strip()) > 1, "business name"), (len(b.description.strip()) >= 10, "description"),
        (bool(b.county and b.town), "location"), (bool(b.phone or b.whatsapp or b.email), "contact details"),
        (any(not h.get("closed") for h in b.hours), "opening hours"), (b.items.exists(), "at least one product or service"),
    ]
    return {"percent": round(sum(ok for ok, _ in checks) / len(checks) * 100), "missing": [l for ok, l in checks if not ok]}


class DashboardSummary(APIView):
    """Every number is computed from the database at request time. Nothing is invented."""

    def get(self, request):
        b = own_business(request.user)
        orders = list(own_orders(request.user)) if b else []
        return Response({
            "business": BusinessSerializer(b).data if b else None,
            "completion": completion(b),
            "itemCount": b.items.count() if b else 0,
            "newOrders": sum(o.status == "NEW" for o in orders),
            "outstandingOrders": sum(o.status not in ("COMPLETED", "CANCELLED") for o in orders),
            "recentOrders": OrderSerializer(orders[:5], many=True).data,
            "checklist": {"done": UserChecklistProgress.objects.filter(user=request.user).count(), "total": SecurityChecklistItem.objects.count()},
        })

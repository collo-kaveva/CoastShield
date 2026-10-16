from collections import defaultdict
from datetime import datetime
from decimal import Decimal

from django.db.models import Sum
from django.utils.timezone import now
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cybersecurity.models import SecurityChecklistItem, UserChecklistProgress
from apps.orders.models import OrderRequest, OrderItem
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


def revenue_analytics(business):
    """Compute monthly revenue from paid completed orders."""
    if not business:
        return []
    
    orders = OrderRequest.objects.filter(
        business=business,
        status="COMPLETED",
        payment_status="PAID"
    ).annotate(
        total=Sum('lines__unit_price_snapshot')
    )
    
    # Group by month
    monthly_data = defaultdict(lambda: Decimal('0'))
    for order in orders:
        month_key = order.created_at.strftime("%b")
        monthly_data[month_key] += order.total or Decimal('0')
    
    # Return last 6 months in order
    months = []
    current = now()
    for i in range(5, -1, -1):
        month_date = current.replace(day=1)
        for _ in range(i):
            if month_date.month == 1:
                month_date = month_date.replace(year=month_date.year - 1, month=12)
            else:
                month_date = month_date.replace(month=month_date.month - 1)
        month_name = month_date.strftime("%b")
        months.append({"month": month_name, "revenue": float(monthly_data.get(month_name, 0))})
    
    return months


class DashboardSummary(APIView):
    """Every number is computed from the database at request time. Nothing is invented."""

    @extend_schema(responses=OpenApiTypes.OBJECT)
    def get(self, request):
        b = own_business(request.user)
        orders = list(own_orders(request.user)) if b else []
        
        # Calculate total revenue
        total_revenue = sum(
            float(line.unit_price_snapshot or 0) * line.quantity
            for order in orders
            for line in order.lines.all()
            if order.status == "COMPLETED" and order.payment_status == "PAID"
        )
        
        # Calculate this month's revenue
        current_month = now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        this_month_revenue = sum(
            float(line.unit_price_snapshot or 0) * line.quantity
            for order in orders
            for line in order.lines.all()
            if order.status == "COMPLETED" and order.payment_status == "PAID" and order.created_at >= current_month
        )
        
        return Response({
            "business": BusinessSerializer(b).data if b else None,
            "completion": completion(b),
            "itemCount": b.items.count() if b else 0,
            "newOrders": sum(o.status == "NEW" for o in orders),
            "outstandingOrders": sum(o.status not in ("COMPLETED", "CANCELLED") for o in orders),
            "recentOrders": OrderSerializer(orders[:5], many=True).data,
            "checklist": {"done": UserChecklistProgress.objects.filter(user=request.user).count(), "total": SecurityChecklistItem.objects.count()},
            "analytics": {
                "totalRevenue": total_revenue,
                "thisMonthRevenue": this_month_revenue,
                "revenueByMonth": revenue_analytics(b),
            },
        })

from django.urls import path
from .dashboard import DashboardSummary

urlpatterns = [path("summary/", DashboardSummary.as_view(), name="dashboard-summary")]

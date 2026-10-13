from django.urls import path
from . import views

urlpatterns = [
    path("analyze-message/", views.AnalyzeMessageView.as_view(), name="analyze-message"),
    path("check-url/", views.CheckUrlView.as_view(), name="check-url"),
    path("analyses/", views.AnalysisHistoryView.as_view(), name="analyses"),
    path("incidents/", views.IncidentGuidesView.as_view(), name="incidents"),
    path("checklist/", views.ChecklistView.as_view(), name="checklist"),
    path("checklist/<slug:key>/", views.ChecklistItemView.as_view(), name="checklist-item"),
]

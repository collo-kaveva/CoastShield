from django.urls import path
from . import views

urlpatterns = [
    path("me/logo/", views.LogoView.as_view(), name="business-logo"),
    path("me/", views.MyBusinessView.as_view(), name="business-me"),
    path("me/publish/", views.PublishView.as_view(publish=True), name="business-publish"),
    path("me/unpublish/", views.PublishView.as_view(publish=False), name="business-unpublish"),
]

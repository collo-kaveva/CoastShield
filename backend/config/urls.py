from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

api_v1 = [
    path("", include("apps.common.urls")),
    path("auth/", include("apps.accounts.urls")),
    path("business/", include("apps.businesses.urls")),
    path("catalog/", include("apps.catalog.urls")),
    path("storefronts/", include("apps.businesses.storefront_urls")),
    path("", include("apps.orders.urls")),
    path("dashboard/", include("apps.businesses.dashboard_urls")),
    path("security/", include("apps.cybersecurity.urls")),
    path("audit/", include("apps.audit.urls")),
    path("payments/", include("apps.payments.urls")),
    path("schema/", SpectacularAPIView.as_view(), name="schema"),
    path("docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="docs"),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include(api_v1)),
]

# Development only. In production the web server must serve MEDIA_ROOT (files are always re-encoded PNGs with random names).
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

handler404 = "apps.common.views.not_found"
handler500 = "apps.common.views.server_failure"

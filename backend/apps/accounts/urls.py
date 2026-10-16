from django.urls import path
from . import views

urlpatterns = [
    path("csrf/", views.CsrfView.as_view(), name="csrf"),
    path("register/", views.RegisterView.as_view(), name="register"),
    path("login/", views.LoginView.as_view(), name="login"),
    path("logout/", views.LogoutView.as_view(), name="logout"),
    path("", views.MeView.as_view(), name="me"),
    path("reset-password/", views.PasswordResetRequestView.as_view(), name="reset-password"),
    path("verify-email/", views.EmailVerificationView.as_view(), name="verify-email"),
    path("resend-verification/", views.ResendVerificationView.as_view(), name="resend-verification"),
    path("mfa/setup/", views.MFASetupView.as_view(), name="mfa-setup"),
    path("mfa/verify/", views.MFAVerifyView.as_view(), name="mfa-verify"),
    path("mfa/disable/", views.MFADisableView.as_view(), name="mfa-disable"),
    path("staff/", views.StaffListView.as_view(), name="staff-list"),
    path("staff/invite/", views.StaffInviteView.as_view(), name="staff-invite"),
    path("staff/accept/", views.StaffAcceptInvitationView.as_view(), name="staff-accept"),
    path("account/deletion-request/", views.AccountDeletionRequestView.as_view(), name="account-deletion-request"),
    path("account/data-export/", views.PersonalDataExportView.as_view(), name="data-export"),
]

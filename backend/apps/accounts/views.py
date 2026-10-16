from django.contrib.auth import authenticate, login, logout
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema, extend_schema_view, inline_serializer
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.audit import services as audit
from apps.common.auth import CsrfAlwaysSessionAuth
from apps.common.errors import Conflict  # noqa: F401  (re-exported for symmetry)

from .serializers import (
    LoginSerializer,
    ProfileSerializer,
    RegisterSerializer,
    UserSerializer,
    EmailVerificationSerializer,
    MFASetupSerializer,
    MFAVerifySerializer,
    StaffSerializer,
    StaffInviteSerializer,
)
from .models import User
from .notifications import NotificationService
from .mfa import MFAService


@extend_schema_view(get=extend_schema(responses=OpenApiTypes.OBJECT, auth=[]))
@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfView(APIView):
    permission_classes = [AllowAny]
    authentication_classes: list = []

    def get(self, request):
        return Response({"csrfToken": get_token(request)})


class RegisterView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [CsrfAlwaysSessionAuth]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "register"

    @extend_schema(request=RegisterSerializer, responses={201: UserSerializer})
    def post(self, request):
        s = RegisterSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        user = User.objects.create_user(email=s.validated_data["email"], password=s.validated_data["password"], name=s.validated_data["name"])
        
        # Generate email verification token
        token = user.generate_email_verification_token()
        
        # Send verification email
        notification_service = NotificationService()
        verification_url = f"{request.build_absolute_uri('/')}verify-email/{token}/"
        notification_service.send_email_verification(user.email, verification_url)
        
        login(request, user)
        audit.record("REGISTER", actor=user, target_type="user", target_id=user.id, request=request)
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [CsrfAlwaysSessionAuth]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    @extend_schema(request=LoginSerializer, responses={200: UserSerializer})
    def post(self, request):
        s = LoginSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        email, password = s.validated_data["email"].strip().lower(), s.validated_data["password"]
        user = authenticate(request, username=email, password=password)
        if user is None or not user.is_active:
            # Same message whether the email exists or not. Only a hash of the identifier is logged.
            audit.record("LOGIN_FAILURE", metadata={"identifier_hash": audit.hash_identifier(email)}, request=request)
            from rest_framework.exceptions import AuthenticationFailed
            raise AuthenticationFailed("Incorrect email or password.")
        login(request, user)
        audit.record("LOGIN_SUCCESS", actor=user, target_type="user", target_id=user.id, request=request)
        return Response(UserSerializer(user).data)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=None, responses={204: None})
    def post(self, request):
        audit.record("LOGOUT", actor=request.user, request=request)
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema_view(patch=extend_schema(request=ProfileSerializer, responses=OpenApiTypes.OBJECT))
class MeView(APIView):
    """GET returns {"user": null} when signed out so the SPA can check its session without error noise."""
    permission_classes = [AllowAny]

    @extend_schema(responses=OpenApiTypes.OBJECT)  # {"user": {...} | null}
    def get(self, request):
        if not request.user.is_authenticated:
            return Response({"user": None})
        return Response({"user": UserSerializer(request.user).data})

    def patch(self, request):
        if not request.user.is_authenticated:
            from rest_framework.exceptions import NotAuthenticated
            raise NotAuthenticated()
        s = ProfileSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        request.user.name = s.validated_data["name"]
        request.user.save(update_fields=["name"])
        return Response({"user": UserSerializer(request.user).data})


class PasswordResetRequestView(APIView):
    """Always 204 so the endpoint cannot be used to discover which emails have accounts."""
    permission_classes = [AllowAny]
    authentication_classes = [CsrfAlwaysSessionAuth]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    @extend_schema(request=inline_serializer("PasswordResetRequest", {"email": serializers.EmailField()}), responses={204: None})
    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        try:
            user = User.objects.get(email=email)
            token = user.generate_password_reset_token()
            
            # Send password reset email
            notification_service = NotificationService()
            reset_url = f"{request.build_absolute_uri('/')}reset-password/{token}/"
            notification_service.send_password_reset(user.email, reset_url)
        except User.DoesNotExist:
            # Return 204 regardless to prevent email enumeration
            pass
        return Response(status=status.HTTP_204_NO_CONTENT)


class EmailVerificationView(APIView):
    """Verify email using token sent to user's email."""
    permission_classes = [AllowAny]

    @extend_schema(request=EmailVerificationSerializer, responses={200: UserSerializer})
    def post(self, request):
        s = EmailVerificationSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        token = s.validated_data["token"]
        
        try:
            user = User.objects.get(email_verification_token=token)
            if not user.is_email_verification_valid():
                return Response({"error": "Token has expired"}, status=status.HTTP_400_BAD_REQUEST)
            
            user.email_verified = True
            user.email_verification_token = ""
            user.email_verification_expires_at = None
            user.save()
            
            audit.record("EMAIL_VERIFIED", actor=user, target_type="user", target_id=user.id, request=request)
            return Response(UserSerializer(user).data)
        except User.DoesNotExist:
            return Response({"error": "Invalid token"}, status=status.HTTP_400_BAD_REQUEST)


class ResendVerificationView(APIView):
    """Resend email verification token."""
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "register"

    @extend_schema(responses={204: None})
    def post(self, request):
        if request.user.email_verified:
            return Response({"error": "Email already verified"}, status=status.HTTP_400_BAD_REQUEST)
        
        token = request.user.generate_email_verification_token()
        notification_service = NotificationService()
        verification_url = f"{request.build_absolute_uri('/')}verify-email/{token}/"
        notification_service.send_email_verification(request.user.email, verification_url)
        
        return Response(status=status.HTTP_204_NO_CONTENT)


class MFASetupView(APIView):
    """Setup TOTP-based MFA."""
    permission_classes = [IsAuthenticated]

    @extend_schema(request=MFASetupSerializer, responses={200: OpenApiTypes.OBJECT})
    def post(self, request):
        if request.user.mfa_enabled:
            return Response({"error": "MFA already enabled"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Generate TOTP secret
        secret = MFAService.generate_secret()
        request.user.mfa_secret = secret
        request.user.save()
        
        # Generate QR code
        qr_code = MFAService.generate_qr_code(secret, request.user.email)
        
        # Generate backup codes
        backup_codes = MFAService.generate_backup_codes()
        hashed_codes = [MFAService.hash_backup_code(code) for code in backup_codes]
        request.user.mfa_backup_codes = hashed_codes
        request.user.save()
        
        return Response({
            "secret": secret,
            "qr_code": qr_code,
            "backup_codes": backup_codes,  # Only shown once
        })


class MFAVerifyView(APIView):
    """Verify TOTP code to enable MFA."""
    permission_classes = [IsAuthenticated]

    @extend_schema(request=MFAVerifySerializer, responses={200: UserSerializer})
    def post(self, request):
        s = MFAVerifySerializer(data=request.data)
        s.is_valid(raise_exception=True)
        code = s.validated_data["code"]
        
        if not request.user.mfa_secret:
            return Response({"error": "MFA not set up"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Verify TOTP code or backup code
        if MFAService.verify_totp(request.user.mfa_secret, code):
            request.user.mfa_enabled = True
            request.user.save()
            audit.record("MFA_ENABLED", actor=request.user, target_type="user", target_id=request.user.id, request=request)
            return Response(UserSerializer(request.user).data)
        elif MFAService.verify_backup_code(request.user.mfa_backup_codes, code):
            # Remove used backup code
            hashed_input = MFAService.hash_backup_code(code)
            request.user.mfa_backup_codes = [c for c in request.user.mfa_backup_codes if c != hashed_input]
            request.user.mfa_enabled = True
            request.user.save()
            audit.record("MFA_ENABLED_BACKUP", actor=request.user, target_type="user", target_id=request.user.id, request=request)
            return Response(UserSerializer(request.user).data)
        else:
            return Response({"error": "Invalid code"}, status=status.HTTP_400_BAD_REQUEST)


class MFADisableView(APIView):
    """Disable MFA (requires TOTP code)."""
    permission_classes = [IsAuthenticated]

    @extend_schema(request=MFAVerifySerializer, responses={200: UserSerializer})
    def post(self, request):
        s = MFAVerifySerializer(data=request.data)
        s.is_valid(raise_exception=True)
        code = s.validated_data["code"]
        
        if not request.user.mfa_enabled:
            return Response({"error": "MFA not enabled"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Verify TOTP code or backup code
        if MFAService.verify_totp(request.user.mfa_secret, code) or MFAService.verify_backup_code(request.user.mfa_backup_codes, code):
            request.user.mfa_enabled = False
            request.user.mfa_secret = ""
            request.user.mfa_backup_codes = []
            request.user.save()
            audit.record("MFA_DISABLED", actor=request.user, target_type="user", target_id=request.user.id, request=request)
            return Response(UserSerializer(request.user).data)
        else:
            return Response({"error": "Invalid code"}, status=status.HTTP_400_BAD_REQUEST)


class StaffListView(APIView):
    """List staff members for a business."""
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: StaffSerializer(many=True)})
    def get(self, request):
        from apps.businesses.models import BusinessProfile
        from .staff import Staff
        
        try:
            business = BusinessProfile.objects.get(owner_id=request.user.id)
        except BusinessProfile.DoesNotExist:
            return Response({"error": "Business not found"}, status=status.HTTP_404_NOT_FOUND)
        
        staff = Staff.objects.filter(business=business).select_related("user")
        serializer = StaffSerializer(staff, many=True)
        return Response(serializer.data)


class StaffInviteView(APIView):
    """Invite a new staff member."""
    permission_classes = [IsAuthenticated]

    @extend_schema(request=StaffInviteSerializer, responses={201: StaffSerializer})
    def post(self, request):
        from apps.businesses.models import BusinessProfile
        from .staff import Staff
        
        s = StaffInviteSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        
        try:
            business = BusinessProfile.objects.get(owner_id=request.user.id)
        except BusinessProfile.DoesNotExist:
            return Response({"error": "Business not found"}, status=status.HTTP_404_NOT_FOUND)
        
        email = s.validated_data["email"].strip().lower()
        role = s.validated_data["role"]
        
        # Check if user exists
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"error": "User not found. Ask them to register first."}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if already staff
        if Staff.objects.filter(business=business, user=user).exists():
            return Response({"error": "User is already a staff member"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create staff invitation
        staff = Staff.objects.create(
            business=business,
            user=user,
            role=role,
            invited_by=request.user,
        )
        
        token = staff.generate_invitation_token()
        
        # Send invitation email
        notification_service = NotificationService()
        invitation_url = f"{request.build_absolute_uri('/')}accept-invitation/{token}/"
        notification_service.send_staff_invitation(user.email, business.name, invitation_url)
        
        audit.record("STAFF_INVITED", actor=request.user, target_type="staff", target_id=staff.id, request=request)
        serializer = StaffSerializer(staff)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class StaffAcceptInvitationView(APIView):
    """Accept a staff invitation."""
    permission_classes = [IsAuthenticated]

    @extend_schema(request=inline_serializer("AcceptInvitation", {"token": serializers.CharField()}), responses={200: StaffSerializer})
    def post(self, request):
        from .staff import Staff
        
        token = request.data.get("token")
        try:
            staff = Staff.objects.get(invitation_token=token, user=request.user)
        except Staff.DoesNotExist:
            return Response({"error": "Invalid invitation"}, status=status.HTTP_400_BAD_REQUEST)
        
        if not staff.is_invitation_valid():
            return Response({"error": "Invitation has expired"}, status=status.HTTP_400_BAD_REQUEST)
        
        staff.accept_invitation()
        audit.record("STAFF_INVITATION_ACCEPTED", actor=request.user, target_type="staff", target_id=staff.id, request=request)
        serializer = StaffSerializer(staff)
        return Response(serializer.data)


class AccountDeletionRequestView(APIView):
    """Request account deletion."""
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={204: None})
    def post(self, request):
        from django.utils import timezone
        from datetime import timedelta
        
        if request.user.deletion_requested_at:
            return Response({"error": "Deletion already requested"}, status=status.HTTP_400_BAD_REQUEST)
        
        request.user.deletion_requested_at = timezone.now()
        request.user.deletion_scheduled_at = timezone.now() + timedelta(days=30)
        request.user.save()
        
        audit.record("ACCOUNT_DELETION_REQUESTED", actor=request.user, target_type="user", target_id=request.user.id, request=request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class PersonalDataExportView(APIView):
    """Export all personal data for the user."""
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: OpenApiTypes.OBJECT})
    def get(self, request):
        from apps.businesses.models import BusinessProfile
        from apps.orders.models import OrderRequest
        from .staff import Staff
        
        user = request.user
        
        data = {
            "user": {
                "id": str(user.id),
                "email": user.email,
                "name": user.name,
                "role": user.role,
                "date_joined": user.date_joined.isoformat(),
            },
            "business": None,
            "staff_assignments": [],
            "orders": [],
        }
        
        # Business data
        try:
            business = BusinessProfile.objects.get(owner_id=user.id)
            data["business"] = {
                "id": str(business.id),
                "name": business.name,
                "category": business.category,
                "description": business.description,
                "county": business.county,
                "town": business.town,
                "phone": business.phone,
                "whatsapp": business.whatsapp,
                "email": business.email,
                "created_at": business.created_at.isoformat(),
            }
        except BusinessProfile.DoesNotExist:
            pass
        
        # Staff assignments
        staff_assignments = Staff.objects.filter(user=user).select_related("business")
        data["staff_assignments"] = [
            {
                "id": str(s.id),
                "business": s.business.name,
                "role": s.role,
                "status": s.status,
                "invited_at": s.invited_at.isoformat(),
            }
            for s in staff_assignments
        ]
        
        # Orders (as customer)
        # Note: Orders are linked to business, not directly to customer email in current model
        # This would need to be updated to track customer orders per user
        
        audit.record("DATA_EXPORT", actor=user, target_type="user", target_id=user.id, request=request)
        return Response(data)

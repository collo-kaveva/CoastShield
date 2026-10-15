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

from .serializers import LoginSerializer, ProfileSerializer, RegisterSerializer, UserSerializer


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
        from .models import User
        user = User.objects.create_user(email=s.validated_data["email"], password=s.validated_data["password"], name=s.validated_data["name"])
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
    """Always 204 so the endpoint cannot be used to discover which emails have accounts.
    Email delivery is not implemented in the MVP; no token is created."""
    permission_classes = [AllowAny]
    authentication_classes = [CsrfAlwaysSessionAuth]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    @extend_schema(request=inline_serializer("PasswordResetRequest", {"email": serializers.EmailField()}), responses={204: None})
    def post(self, request):
        return Response(status=status.HTTP_204_NO_CONTENT)

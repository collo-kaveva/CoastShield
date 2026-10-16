from django.contrib.auth import password_validation
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import User
from .staff import Staff


class UserSerializer(serializers.ModelSerializer):
    """Public shape of the signed-in user. Never includes password data."""
    id = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = ["id", "name", "email", "role", "email_verified", "mfa_enabled"]


class RegisterSerializer(serializers.Serializer):
    name = serializers.CharField(min_length=2, max_length=80, trim_whitespace=True)
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(write_only=True, min_length=8, max_length=128, trim_whitespace=False)

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate(self, attrs):
        probe = User(email=attrs["email"], name=attrs["name"])
        try:
            password_validation.validate_password(attrs["password"], probe)
        except DjangoValidationError as e:
            raise serializers.ValidationError({"password": list(e.messages)})
        return attrs


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(write_only=True, max_length=128, trim_whitespace=False)


class ProfileSerializer(serializers.Serializer):
    name = serializers.CharField(min_length=2, max_length=80, trim_whitespace=True)


class EmailVerificationSerializer(serializers.Serializer):
    token = serializers.CharField(min_length=1, max_length=64)


class MFASetupSerializer(serializers.Serializer):
    pass  # No input needed, generates secret and QR code


class MFAVerifySerializer(serializers.Serializer):
    code = serializers.CharField(min_length=6, max_length=10)


class StaffSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_name = serializers.CharField(source="user.name", read_only=True)
    invited_by_name = serializers.CharField(source="invited_by.name", read_only=True)

    class Meta:
        model = Staff
        fields = [
            "id", "user_email", "user_name", "role", "status",
            "invited_by_name", "invited_at", "accepted_at", "created_at",
        ]


class StaffInviteSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    role = serializers.ChoiceField(choices=Staff.Role.choices)

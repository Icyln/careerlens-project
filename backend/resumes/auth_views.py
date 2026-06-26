import re

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

try:
    from google.auth.transport import requests as google_requests
    from google.oauth2 import id_token as google_id_token
except Exception:  # pragma: no cover
    google_requests = None
    google_id_token = None

from .serializers import SignupSerializer, UserProfileSerializer

User = get_user_model()


def build_token_response(user, status_code=status.HTTP_200_OK):
    refresh = RefreshToken.for_user(user)

    return Response(
        {
            'user': UserProfileSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        },
        status=status_code,
    )


def build_unique_username(email: str) -> str:
    email = str(email or '').strip().lower()
    base = email.split('@')[0] if '@' in email else email
    base = re.sub(r'[^a-zA-Z0-9_]+', '_', base).strip('_')
    base = base[:24] or 'google_user'

    username = base
    counter = 1

    while User.objects.filter(username__iexact=username).exists():
        suffix = f'_{counter}'
        username = f'{base[:30 - len(suffix)]}{suffix}'
        counter += 1

    return username


class EmailOrUsernameTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Allows login using either username or email.
    Frontend can still send the field as "username".
    """

    def validate(self, attrs):
        login_value = str(attrs.get('username') or '').strip()
        password = attrs.get('password') or ''

        if not login_value:
            raise serializers.ValidationError({'username': 'Email or username is required.'})

        user = (
            User.objects.filter(email__iexact=login_value).first()
            or User.objects.filter(username__iexact=login_value).first()
        )

        username_value = getattr(user, User.USERNAME_FIELD, login_value) if user else login_value

        data = super().validate({
            User.USERNAME_FIELD: username_value,
            'password': password,
        })

        data['user'] = UserProfileSerializer(self.user).data
        return data


class LoginView(TokenObtainPairView):
    permission_classes = [AllowAny]
    serializer_class = EmailOrUsernameTokenObtainPairSerializer


class SignupView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        return build_token_response(user, status_code=status.HTTP_201_CREATED)


class GoogleLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        credential = (
            request.data.get('credential')
            or request.data.get('id_token')
            or request.data.get('token')
        )

        if not credential:
            return Response(
                {'detail': 'Google credential is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        client_id = getattr(settings, 'GOOGLE_OAUTH_CLIENT_ID', '')

        if not client_id:
            return Response(
                {'detail': 'GOOGLE_OAUTH_CLIENT_ID is not configured on the backend.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        if google_id_token is None or google_requests is None:
            return Response(
                {'detail': 'google-auth is not installed on the backend.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            payload = google_id_token.verify_oauth2_token(
                credential,
                google_requests.Request(),
                client_id,
            )
        except Exception:
            return Response(
                {'detail': 'Invalid or expired Google credential.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        email = str(payload.get('email') or '').strip().lower()
        email_verified = payload.get('email_verified') is True

        if not email:
            return Response(
                {'detail': 'Google account did not provide an email address.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not email_verified:
            return Response(
                {'detail': 'Google email is not verified.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        first_name = str(payload.get('given_name') or '').strip()
        last_name = str(payload.get('family_name') or '').strip()

        with transaction.atomic():
            user = User.objects.filter(email__iexact=email).first()

            if user:
                if not user.is_active:
                    return Response(
                        {'detail': 'This account is inactive.'},
                        status=status.HTTP_403_FORBIDDEN,
                    )

                update_fields = []

                if first_name and not user.first_name:
                    user.first_name = first_name
                    update_fields.append('first_name')

                if last_name and not user.last_name:
                    user.last_name = last_name
                    update_fields.append('last_name')

                if update_fields:
                    user.save(update_fields=update_fields)
            else:
                user = User(
                    username=build_unique_username(email),
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    is_active=True,
                )
                user.set_unusable_password()
                user.save()

        return build_token_response(user, status_code=status.HTTP_200_OK)


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        serializer = UserProfileSerializer(
            request.user,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data, status=status.HTTP_200_OK)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')

        if not refresh_token:
            return Response(
                {'detail': 'Refresh token is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except Exception:
            return Response(
                {'detail': 'Invalid or expired refresh token.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {'detail': 'Logged out successfully.'},
            status=status.HTTP_200_OK,
        )
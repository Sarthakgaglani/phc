from django.conf import settings
from django.http import Http404
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.serializers import UserSerializer
from accounts.services.dev_login import get_demo_user


class LoginView(ObtainAuthToken):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, "user": UserSerializer(user).data})


class LogoutView(APIView):
    def post(self, request):
        request.user.auth_token.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)


class DevLoginView(APIView):
    """
    DEBUG-only convenience for the frontend's dev role switcher: logs in as
    a fixed seeded demo user for the requested role instead of requiring a
    password. 404s outright when DEBUG is off so it can never reach
    production auth.
    """

    permission_classes = [AllowAny]
    authentication_classes = [TokenAuthentication]

    def post(self, request):
        if not settings.DEBUG:
            raise Http404
        role = request.data.get("role")
        user = get_demo_user(role)
        if user is None:
            return Response(
                {"detail": f"No demo user seeded for role '{role}'."},
                status=status.HTTP_404_NOT_FOUND,
            )
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, "user": UserSerializer(user).data})

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from accounts.views import DevLoginView, LoginView, LogoutView, MeView
from accounts.views.user_management import UserManagementViewSet

router = DefaultRouter()
router.register("users", UserManagementViewSet, basename="user")

urlpatterns = [
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("me/", MeView.as_view(), name="me"),
    path("dev-login/", DevLoginView.as_view(), name="dev-login"),
    path("", include(router.urls)),
]

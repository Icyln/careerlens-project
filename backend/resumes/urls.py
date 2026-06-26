from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .auth_views import GoogleLoginView, LoginView, LogoutView, ProfileView, SignupView
from .views import AdminDashboardStatsView, AdminUserViewSet
from .views import AnalysisReportViewSet, JobApplicationViewSet, ResumeViewSet

router = DefaultRouter()
router.register(r'resumes', ResumeViewSet, basename='resume')
router.register(r'analysis', AnalysisReportViewSet, basename='analysis')
router.register(r'applications', JobApplicationViewSet, basename='applications')
router.register(r'admin/users', AdminUserViewSet, basename='admin-users')

urlpatterns = [
    path('auth/signup/', SignupView.as_view(), name='auth-signup'),
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/google/', GoogleLoginView.as_view(), name='auth-google'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='auth-refresh'),
    path('auth/profile/', ProfileView.as_view(), name='auth-profile'),
    path('auth/logout/', LogoutView.as_view(), name='auth-logout'),

    path('admin/stats/', AdminDashboardStatsView.as_view(), name='admin-dashboard-stats'),
    path('', include(router.urls)),
]
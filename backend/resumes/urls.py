from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import AdminDashboardStatsView, AdminUserViewSet
from .views import AnalysisReportViewSet, JobApplicationViewSet, ResumeViewSet

router = DefaultRouter()
router.register(r'resumes', ResumeViewSet, basename='resume')
router.register(r'analysis', AnalysisReportViewSet, basename='analysis')
router.register(r'applications', JobApplicationViewSet, basename='applications')
router.register(r'admin/users', AdminUserViewSet, basename='admin-users')

urlpatterns = [
    path('', include(router.urls)),
    path('admin/stats/', AdminDashboardStatsView.as_view(), name='admin-dashboard-stats'),
]

urlpatterns += router.urls

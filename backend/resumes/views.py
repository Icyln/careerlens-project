from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AnalysisReport, JobApplication, Resume
from .permissions import IsAdminRole
from .serializers import (
    AdminUserSerializer,
    AnalysisReportSerializer,
    AnalysisRequestSerializer,
    JobApplicationSerializer,
    ResumeSerializer,
)
from .services.ai_engine import (
    generate_ai_analysis,
    generate_tailored_resume,
)
from .services.ats_engine import calculate_ats_result
from .services.cover_letter_engine import generate_cover_letter
from .services.dashboard_engine import build_dashboard_payload
from .services.interview_engine import generate_interview_prep
from .services.job_search import search_jobs
from .services.report_pdf import build_report_pdf

DAILY_RESUME_UPLOAD_LIMIT = 5


class ResumeViewSet(viewsets.ModelViewSet):
    serializer_class = ResumeSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Resume.objects.all().order_by('-uploaded_at')

        if self.request.user.is_staff:
            return queryset

        return queryset.filter(owner=self.request.user)

    def perform_create(self, serializer):
        today = timezone.localdate()

        uploaded_today = Resume.objects.filter(
            owner=self.request.user,
            uploaded_at__date=today,
        ).count()

        if uploaded_today >= DAILY_RESUME_UPLOAD_LIMIT:
            raise ValidationError({
                'file': f'You can upload only {DAILY_RESUME_UPLOAD_LIMIT} resumes per day.'
            })

        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['post'], url_path='interview-prep')
    def interview_prep(self, request, pk=None):
        resume = self.get_object()

        job_title = str(request.data.get('job_title') or '').strip()
        job_description = str(request.data.get('job_description') or '').strip()

        if not job_title:
            return Response(
                {'job_title': 'Target role is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not job_description:
            return Response(
                {'job_description': 'Job description is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        result = generate_interview_prep(
            resume_text=resume.extracted_text or '',
            job_title=job_title,
            job_description=job_description,
            interview_type=str(request.data.get('interview_type') or 'role_specific').strip(),
            difficulty=str(request.data.get('difficulty') or 'real_interview').strip(),
            focus_area=str(request.data.get('focus_area') or 'all').strip(),
            user_notes=str(request.data.get('user_notes') or '').strip(),
        )

        return Response(result, status=status.HTTP_200_OK)

class AnalysisReportViewSet(viewsets.ModelViewSet):
    serializer_class = AnalysisReportSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'delete', 'head', 'options']

    def get_queryset(self):
        queryset = AnalysisReport.objects.select_related('resume', 'resume__owner').all()

        if self.request.user.is_staff:
            return queryset

        return queryset.filter(resume__owner=self.request.user)

    def create(self, request, *args, **kwargs):
        request_serializer = AnalysisRequestSerializer(data=request.data)
        request_serializer.is_valid(raise_exception=True)

        resume_queryset = Resume.objects.all()

        if not request.user.is_staff:
            resume_queryset = resume_queryset.filter(owner=request.user)

        resume = get_object_or_404(
            resume_queryset,
            id=request_serializer.validated_data['resume_id'],
        )

        job_title = request_serializer.validated_data['job_title']
        job_description = request_serializer.validated_data['job_description']

        ats_result = calculate_ats_result(resume, job_title, job_description)
        ai_result = generate_ai_analysis(resume.extracted_text, job_title, job_description)

        report = AnalysisReport.objects.create(
            resume=resume,
            job_title=job_title,
            job_description=job_description,
            ats_result=ats_result,
            ai_result=ai_result,
        )

        return Response(self.get_serializer(report).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='latest')
    def latest(self, request):
        report = self.get_queryset().order_by('-created_at').first()

        if not report:
            return Response(None, status=status.HTTP_200_OK)

        serializer = self.get_serializer(report)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='dashboard')
    def dashboard(self, request):
        resumes_queryset = Resume.objects.annotate(reports_count=Count('reports')).order_by('-uploaded_at')
        reports_queryset = AnalysisReport.objects.select_related('resume', 'resume__owner').order_by('-created_at')
        applications_queryset = JobApplication.objects.order_by('-updated_at', '-created_at')

        if not request.user.is_staff:
            resumes_queryset = resumes_queryset.filter(owner=request.user)
            reports_queryset = reports_queryset.filter(resume__owner=request.user)
            applications_queryset = applications_queryset.filter(owner=request.user)

        resumes = list(resumes_queryset)
        reports = list(reports_queryset[:50])
        applications = list(applications_queryset[:100])

        metrics = build_dashboard_payload(resumes, reports, applications)

        metrics['user_role'] = 'admin' if request.user.is_staff else 'user'

        return Response(metrics, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='jobs')
    def jobs(self, request):
        query = request.query_params.get('query', '').strip()
        country = request.query_params.get('country', '').strip()
        sort = request.query_params.get('sort', 'relevance').strip() or 'relevance'

        try:
            max_days_old = int(request.query_params.get('max_days_old', '30'))
        except ValueError:
            max_days_old = 30

        max_days_old = max(1, min(max_days_old, 30))

        result = search_jobs(
            query=query,
            country=country,
            sort=sort,
            max_days_old=max_days_old,
            limit=24,
        )

        return Response(result, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='tailor-resume')
    def tailor_resume(self, request, pk=None):
        report = self.get_object()

        selected_template = str(request.data.get('template') or 'classic_ats')

        if selected_template not in {'classic_ats', 'modern_professional', 'compact_graduate'}:
            selected_template = 'classic_ats'

        confirmed_keywords = request.data.get('confirmed_keywords') or {}

        if not isinstance(confirmed_keywords, dict):
            confirmed_keywords = {}

        result = generate_tailored_resume(
            report.resume.extracted_text or '',
            report.job_title,
            report.job_description,
            report.ats_result or {},
            selected_template=selected_template,
            confirmed_keywords=confirmed_keywords,
        )

        return Response(result, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='export-pdf')
    def export_pdf(self, request, pk=None):
        report = self.get_object()
        pdf_bytes = build_report_pdf(report)
        filename = f'careerlens_report_{report.id}.pdf'

        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        return response

    @action(detail=True, methods=['post'], url_path='cover-letter')
    def cover_letter(self, request, pk=None):
        report = self.get_object()

        focus_keywords = request.data.get('focus_keywords') or []

        if isinstance(focus_keywords, str):
            focus_keywords = [
                item.strip()
                for item in focus_keywords.split(',')
                if item.strip()
            ]

        if not isinstance(focus_keywords, list):
            focus_keywords = []

        result = generate_cover_letter(
            resume_text=report.resume.extracted_text or '',
            job_title=report.job_title,
            job_description=report.job_description,
            company_name=str(request.data.get('company_name') or '').strip(),
            hiring_manager=str(request.data.get('hiring_manager') or '').strip(),
            candidate_name=str(request.data.get('candidate_name') or '').strip(),
            tone=str(request.data.get('tone') or 'professional').strip(),
            length=str(request.data.get('length') or 'standard').strip(),
            focus_keywords=[
                str(item).strip()
                for item in focus_keywords
                if str(item).strip()
            ],
            user_notes=str(request.data.get('user_notes') or '').strip(),
        )

        return Response(result, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='interview-prep')
    def interview_prep(self, request, pk=None):
        report = self.get_object()

        job_title = str(request.data.get('job_title') or report.job_title or '').strip()
        job_description = str(request.data.get('job_description') or report.job_description or '').strip()

        result = generate_interview_prep(
            resume_text=report.resume.extracted_text or '',
            job_title=job_title,
            job_description=job_description,
            interview_type=str(request.data.get('interview_type') or 'role_specific').strip(),
            difficulty=str(request.data.get('difficulty') or 'real_interview').strip(),
            focus_area=str(request.data.get('focus_area') or 'all').strip(),
            user_notes=str(request.data.get('user_notes') or '').strip(),
        )

        return Response(result, status=status.HTTP_200_OK)


class JobApplicationViewSet(viewsets.ModelViewSet):
    serializer_class = JobApplicationSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        queryset = JobApplication.objects.select_related(
            'owner',
            'resume',
            'analysis_report',
            'analysis_report__resume',
        ).order_by('-updated_at', '-created_at')

        user = self.request.user

        if user.is_staff:
            return queryset

        return queryset.filter(owner=user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def _filtered_queryset(self):
        queryset = self.get_queryset()

        status_value = self.request.query_params.get('status', '').strip()
        priority = self.request.query_params.get('priority', '').strip()
        search = self.request.query_params.get('search', '').strip()

        if status_value:
            queryset = queryset.filter(status=status_value)

        if priority:
            queryset = queryset.filter(priority=priority)

        if search:
            queryset = queryset.filter(
                Q(job_title__icontains=search)
                | Q(company_name__icontains=search)
                | Q(location__icontains=search)
                | Q(notes__icontains=search)
            )

        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self._filtered_queryset()
        serializer = self.get_serializer(queryset, many=True)

        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        queryset = self.get_queryset()
        today = timezone.localdate()

        by_status = {
            item['status']: item['count']
            for item in queryset.order_by().values('status').annotate(count=Count('id'))
        }

        status_order = [
            JobApplication.STATUS_SAVED,
            JobApplication.STATUS_APPLIED,
            JobApplication.STATUS_SCREENING,
            JobApplication.STATUS_INTERVIEW,
            JobApplication.STATUS_OFFER,
            JobApplication.STATUS_REJECTED,
            JobApplication.STATUS_WITHDRAWN,
        ]

        active_statuses = [
            JobApplication.STATUS_SAVED,
            JobApplication.STATUS_APPLIED,
            JobApplication.STATUS_SCREENING,
            JobApplication.STATUS_INTERVIEW,
        ]

        total = queryset.count()
        active = queryset.filter(status__in=active_statuses).count()
        interviews = queryset.filter(status=JobApplication.STATUS_INTERVIEW).count()
        offers = queryset.filter(status=JobApplication.STATUS_OFFER).count()
        rejected = queryset.filter(status=JobApplication.STATUS_REJECTED).count()
        applied_or_later = queryset.exclude(status=JobApplication.STATUS_SAVED).count()

        responses = queryset.filter(
            status__in=[
                JobApplication.STATUS_SCREENING,
                JobApplication.STATUS_INTERVIEW,
                JobApplication.STATUS_OFFER,
                JobApplication.STATUS_REJECTED,
            ]
        ).count()

        followups_due = queryset.filter(
            next_follow_up_date__isnull=False,
            next_follow_up_date__lte=today,
            status__in=active_statuses,
        ).count()

        return Response(
            {
                'total_applications': total,
                'active_applications': active,
                'interviews': interviews,
                'offers': offers,
                'rejected': rejected,
                'followups_due': followups_due,
                'response_rate': round((responses / applied_or_later) * 100, 1) if applied_or_later else 0,
                'interview_rate': round((interviews / applied_or_later) * 100, 1) if applied_or_later else 0,
                'by_status': [
                    {
                        'status': value,
                        'label': dict(JobApplication.STATUS_CHOICES).get(value, value),
                        'count': by_status.get(value, 0),
                    }
                    for value in status_order
                ],
            },
            status=status.HTTP_200_OK,
        )


User = get_user_model()


def is_false_value(value):
    return value is False or str(value).strip().lower() in {'false', '0', 'no', 'off'}


class AdminDashboardStatsView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        thirty_days_ago = timezone.now() - timezone.timedelta(days=30)

        recent_users = User.objects.order_by('-date_joined')[:5]

        return Response({
            'total_users': User.objects.count(),
            'active_users': User.objects.filter(is_active=True).count(),
            'inactive_users': User.objects.filter(is_active=False).count(),
            'admin_users': User.objects.filter(is_staff=True).count(),
            'new_users_30_days': User.objects.filter(date_joined__gte=thirty_days_ago).count(),
            'total_resumes': Resume.objects.count(),
            'total_reports': AnalysisReport.objects.count(),
            'total_applications': JobApplication.objects.count(),
            'recent_users': AdminUserSerializer(recent_users, many=True).data,
        })


class AdminUserViewSet(viewsets.ModelViewSet):
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdminRole]

    def get_queryset(self):
        queryset = User.objects.all().order_by('-date_joined')

        search = self.request.query_params.get('search', '').strip()
        role = self.request.query_params.get('role', '').strip()
        status_filter = self.request.query_params.get('status', '').strip()

        if search:
            queryset = queryset.filter(
                username__icontains=search
            ) | queryset.filter(
                email__icontains=search
            ) | queryset.filter(
                first_name__icontains=search
            ) | queryset.filter(
                last_name__icontains=search
            )

        if role == 'admin':
            queryset = queryset.filter(is_staff=True)
        elif role == 'user':
            queryset = queryset.filter(is_staff=False)

        if status_filter == 'active':
            queryset = queryset.filter(is_active=True)
        elif status_filter == 'inactive':
            queryset = queryset.filter(is_active=False)

        return queryset.distinct()

    def perform_update(self, serializer):
        target_user = self.get_object()
        request_user = self.request.user

        if target_user.is_superuser and not request_user.is_superuser:
            raise PermissionDenied('Only a superuser can edit another superuser.')

        if target_user.id == request_user.id:
            if 'is_active' in self.request.data and is_false_value(self.request.data.get('is_active')):
                raise ValidationError({'is_active': 'You cannot deactivate your own account.'})

            if 'is_staff' in self.request.data and is_false_value(self.request.data.get('is_staff')):
                raise ValidationError({'is_staff': 'You cannot remove your own admin access.'})

        serializer.save()

    def destroy(self, request, *args, **kwargs):
        target_user = self.get_object()

        if target_user.id == request.user.id:
            raise ValidationError({'detail': 'You cannot delete or deactivate your own account.'})

        if target_user.is_superuser and not request.user.is_superuser:
            raise PermissionDenied('Only a superuser can deactivate another superuser.')

        target_user.is_active = False
        target_user.save(update_fields=['is_active'])

        return Response(
            {'detail': 'User has been deactivated.'},
            status=status.HTTP_200_OK,
        )
from __future__ import annotations

from pathlib import Path

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import AnalysisReport, JobApplication, Resume
from .services.text_extractor import SUPPORTED_EXTENSIONS, extract_text_from_resume

User = get_user_model()

class SignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'password',
            'password_confirm',
        ]
        read_only_fields = ['id']

    def validate(self, attrs):
        password = attrs.get('password')
        password_confirm = attrs.pop('password_confirm', None)

        if password != password_confirm:
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})

        validate_password(password)
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'is_staff',
            'role',
            'date_joined',
        ]
        read_only_fields = [
            'id',
            'is_staff',
            'role',
            'date_joined',
        ]

    def get_role(self, user):
        return 'admin' if user.is_staff else 'user'

    def validate_username(self, value):
        value = str(value).strip()

        if not value:
            raise serializers.ValidationError('Username cannot be empty.')

        queryset = User.objects.filter(username__iexact=value)

        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)

        if queryset.exists():
            raise serializers.ValidationError('This username is already taken.')

        return value

    def validate_email(self, value):
        value = str(value).strip()

        if value:
            queryset = User.objects.filter(email__iexact=value)

            if self.instance:
                queryset = queryset.exclude(pk=self.instance.pk)

            if queryset.exists():
                raise serializers.ValidationError(
                    'This email is already used by another account.'
                )

        return value

    def update(self, instance, validated_data):
        instance.username = validated_data.get('username', instance.username)
        instance.email = validated_data.get('email', instance.email)
        instance.first_name = validated_data.get('first_name', instance.first_name)
        instance.last_name = validated_data.get('last_name', instance.last_name)
        instance.save()

        return instance

class AdminUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    role = serializers.SerializerMethodField()
    total_resumes = serializers.SerializerMethodField()
    total_reports = serializers.SerializerMethodField()
    total_applications = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'is_staff',
            'is_active',
            'is_superuser',
            'role',
            'date_joined',
            'last_login',
            'password',
            'total_resumes',
            'total_reports',
            'total_applications',
        ]
        read_only_fields = [
            'id',
            'is_superuser',
            'role',
            'date_joined',
            'last_login',
            'total_resumes',
            'total_reports',
            'total_applications',
        ]

    def get_role(self, obj):
        return 'admin' if obj.is_staff else 'user'

    def get_total_resumes(self, obj):
        return Resume.objects.filter(owner=obj).count()

    def get_total_reports(self, obj):
        return AnalysisReport.objects.filter(resume__owner=obj).count()

    def get_total_applications(self, obj):
        return JobApplication.objects.filter(owner=obj).count()

    def create(self, validated_data):
        password = validated_data.pop('password', None)

        if not password:
            raise serializers.ValidationError({'password': 'Password is required.'})

        user = User.objects.create_user(
            username=validated_data.get('username'),
            email=validated_data.get('email', ''),
            password=password,
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            is_staff=validated_data.get('is_staff', False),
            is_active=validated_data.get('is_active', True),
        )

        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)

        for field in ['username', 'email', 'first_name', 'last_name', 'is_staff', 'is_active']:
            if field in validated_data:
                setattr(instance, field, validated_data[field])

        if password:
            instance.set_password(password)

        instance.save()
        return instance
    
class ResumeSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    extension = serializers.CharField(read_only=True)
    owner_username = serializers.CharField(source='owner.username', read_only=True)

    class Meta:
        model = Resume
        fields = [
            'id',
            'owner_username',
            'original_name',
            'file',
            'file_url',
            'file_size',
            'file_type',
            'extension',
            'uploaded_at',
            'updated_at',
            'parser_metadata',
            'extracted_text',
        ]
        read_only_fields = [
            'id',
            'owner_username',
            'original_name',
            'file_url',
            'file_size',
            'file_type',
            'extension',
            'uploaded_at',
            'updated_at',
            'parser_metadata',
            'extracted_text',
        ]
        extra_kwargs = {
            'file': {'write_only': True, 'required': True},
        }

    def get_file_url(self, obj: Resume) -> str:
        request = self.context.get('request')
        if not obj.file:
            return ''
        url = obj.file.url
        return request.build_absolute_uri(url) if request else url

    def validate_file(self, value):
        extension = Path(value.name).suffix.lower()
        if extension not in SUPPORTED_EXTENSIONS:
            allowed = ', '.join(sorted(SUPPORTED_EXTENSIONS))
            raise serializers.ValidationError(f'Unsupported resume format. Upload one of: {allowed}.')
        max_bytes = settings.MAX_RESUME_UPLOAD_MB * 1024 * 1024
        if value.size > max_bytes:
            raise serializers.ValidationError(f'Resume is too large. Maximum size is {settings.MAX_RESUME_UPLOAD_MB} MB.')
        return value

    def create(self, validated_data):
        upload = validated_data['file']
        owner = validated_data.pop('owner', None)

        resume = Resume.objects.create(
            owner=owner,
            file=upload,
            original_name=upload.name,
            file_size=upload.size,
            file_type=Path(upload.name).suffix.lower().replace('.', ''),
        )
        self._extract_and_save(resume)
        return resume

    def update(self, instance: Resume, validated_data):
        upload = validated_data.get('file')
        old_file_name = instance.file.name if instance.file else None
        if upload:
            instance.file = upload
            instance.original_name = upload.name
            instance.file_size = upload.size
            instance.file_type = Path(upload.name).suffix.lower().replace('.', '')
            instance.save()
            if old_file_name and old_file_name != instance.file.name and instance.file.storage.exists(old_file_name):
                instance.file.storage.delete(old_file_name)
            self._extract_and_save(instance)
        return instance

    def _extract_and_save(self, resume: Resume) -> None:
        text, metadata = extract_text_from_resume(resume.file.path)
        resume.extracted_text = text
        resume.parser_metadata = metadata
        resume.save(update_fields=['extracted_text', 'parser_metadata', 'updated_at'])


class AnalysisRequestSerializer(serializers.Serializer):
    resume_id = serializers.UUIDField()
    job_title = serializers.CharField(max_length=255)
    job_description = serializers.CharField()

    def validate_job_description(self, value: str) -> str:
        if len(value.strip()) < 80:
            raise serializers.ValidationError('Paste a complete job description with at least 80 characters.')
        return value.strip()

    def validate_job_title(self, value: str) -> str:
        if len(value.strip()) < 2:
            raise serializers.ValidationError('Enter a job title.')
        return value.strip()


class AnalysisReportSerializer(serializers.ModelSerializer):
    resume = ResumeSerializer(read_only=True)

    class Meta:
        model = AnalysisReport
        fields = [
            'id',
            'resume',
            'job_title',
            'job_description',
            'ats_result',
            'ai_result',
            'created_at',
        ]
        read_only_fields = ['id', 'resume', 'ats_result', 'ai_result', 'created_at']

class JobApplicationSerializer(serializers.ModelSerializer):
    resume_id = serializers.PrimaryKeyRelatedField(
        source='resume',
        queryset=Resume.objects.all(),
        required=False,
        allow_null=True,
    )
    analysis_report_id = serializers.PrimaryKeyRelatedField(
        source='analysis_report',
        queryset=AnalysisReport.objects.all(),
        required=False,
        allow_null=True,
    )

    resume_name = serializers.CharField(source='resume.original_name', read_only=True)
    analysis_job_title = serializers.CharField(source='analysis_report.job_title', read_only=True)

    status_label = serializers.CharField(source='get_status_display', read_only=True)
    priority_label = serializers.CharField(source='get_priority_display', read_only=True)
    source_label = serializers.CharField(source='get_source_display', read_only=True)

    job_match_score = serializers.SerializerMethodField()
    ats_readability_score = serializers.SerializerMethodField()

    class Meta:
        model = JobApplication
        fields = [
            'id',
            'job_title',
            'company_name',
            'location',
            'job_url',
            'source',
            'source_label',
            'status',
            'status_label',
            'priority',
            'priority_label',
            'employment_type',
            'salary',
            'job_description_snapshot',
            'notes',
            'date_saved',
            'date_applied',
            'deadline',
            'next_follow_up_date',
            'resume_id',
            'resume_name',
            'analysis_report_id',
            'analysis_job_title',
            'job_match_score',
            'ats_readability_score',
            'created_at',
            'updated_at',
            'status_updated_at',
        ]
        read_only_fields = [
            'id',
            'source_label',
            'status_label',
            'priority_label',
            'resume_name',
            'analysis_job_title',
            'job_match_score',
            'ats_readability_score',
            'created_at',
            'updated_at',
            'status_updated_at',
        ]

    def get_job_match_score(self, obj):
        if not obj.analysis_report:
            return None

        ats = obj.analysis_report.ats_result or {}
        value = ats.get('job_match_score')

        if value is None:
            value = ats.get('overall_score')

        return value

    def get_ats_readability_score(self, obj):
        if not obj.analysis_report:
            return None

        ats = obj.analysis_report.ats_result or {}
        return ats.get('ats_readability_score')

    def validate(self, attrs):
        request = self.context.get('request')
        user = getattr(request, 'user', None)

        resume = attrs.get('resume')
        analysis_report = attrs.get('analysis_report')

        job_url = attrs.get('job_url') or getattr(self.instance, 'job_url', '')

        if user and user.is_authenticated and not user.is_staff:
            if resume and resume.owner_id != user.id:
                raise serializers.ValidationError({
                    'resume_id': 'You can only attach your own resume.'
                })

            if analysis_report and analysis_report.resume.owner_id != user.id:
                raise serializers.ValidationError({
                    'analysis_report_id': 'You can only attach your own ATS report.'
                })

        if analysis_report and resume and analysis_report.resume_id != resume.id:
            raise serializers.ValidationError({
                'analysis_report_id': 'This ATS report does not belong to the selected resume.'
            })

        if analysis_report and not resume:
            attrs['resume'] = analysis_report.resume

        if user and user.is_authenticated and job_url:
            duplicate_queryset = JobApplication.objects.filter(
                owner=user,
                job_url=job_url,
            )

            if self.instance:
                duplicate_queryset = duplicate_queryset.exclude(id=self.instance.id)

            if duplicate_queryset.exists():
                raise serializers.ValidationError({
                    'job_url': 'This job is already in your application tracker.'
        })

        return attrs

    def validate_job_title(self, value):
        value = (value or '').strip()

        if len(value) < 2:
            raise serializers.ValidationError('Enter a job title.')

        return value

    def validate_company_name(self, value):
        value = (value or '').strip()

        if len(value) < 2:
            raise serializers.ValidationError('Enter a company name.')

        return value

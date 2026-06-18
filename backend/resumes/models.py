import os
import uuid
from pathlib import Path

from django.conf import settings
from django.db import models
from django.utils.text import get_valid_filename


def resume_upload_path(instance, filename: str) -> str:
    suffix = Path(filename).suffix.lower()
    safe_name = get_valid_filename(Path(filename).stem)[:80] or 'resume'
    owner_id = getattr(instance, 'owner_id', None) or 'anonymous'
    return f'resumes/user_{owner_id}/{uuid.uuid4()}_{safe_name}{suffix}'


class Resume(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='resumes',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    original_name = models.CharField(max_length=255)
    file = models.FileField(upload_to=resume_upload_path)
    file_size = models.PositiveBigIntegerField(default=0)
    file_type = models.CharField(max_length=12)
    extracted_text = models.TextField(blank=True)
    parser_metadata = models.JSONField(default=dict, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self) -> str:
        return self.original_name

    @property
    def extension(self) -> str:
        return Path(self.original_name).suffix.lower().replace('.', '')

    def delete(self, using=None, keep_parents=False):
        storage = self.file.storage if self.file else None
        file_name = self.file.name if self.file else None
        result = super().delete(using=using, keep_parents=keep_parents)
        if storage and file_name and storage.exists(file_name):
            storage.delete(file_name)
        return result


class AnalysisReport(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    resume = models.ForeignKey(Resume, related_name='reports', on_delete=models.CASCADE)
    job_title = models.CharField(max_length=255)
    job_description = models.TextField()
    ats_result = models.JSONField(default=dict)
    ai_result = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f'{self.job_title} - {self.resume.original_name}'

class JobApplication(models.Model):
    STATUS_SAVED = 'saved'
    STATUS_APPLIED = 'applied'
    STATUS_SCREENING = 'screening'
    STATUS_INTERVIEW = 'interview'
    STATUS_OFFER = 'offer'
    STATUS_REJECTED = 'rejected'
    STATUS_WITHDRAWN = 'withdrawn'

    STATUS_CHOICES = [
        (STATUS_SAVED, 'Saved'),
        (STATUS_APPLIED, 'Applied'),
        (STATUS_SCREENING, 'Screening'),
        (STATUS_INTERVIEW, 'Interview'),
        (STATUS_OFFER, 'Offer'),
        (STATUS_REJECTED, 'Rejected'),
        (STATUS_WITHDRAWN, 'Withdrawn'),
    ]

    PRIORITY_LOW = 'low'
    PRIORITY_MEDIUM = 'medium'
    PRIORITY_HIGH = 'high'

    PRIORITY_CHOICES = [
        (PRIORITY_LOW, 'Low'),
        (PRIORITY_MEDIUM, 'Medium'),
        (PRIORITY_HIGH, 'High'),
    ]

    SOURCE_MANUAL = 'manual'
    SOURCE_JSEARCH = 'jsearch'
    SOURCE_LINKEDIN = 'linkedin'
    SOURCE_INDEED = 'indeed'
    SOURCE_COMPANY = 'company'
    SOURCE_REFERRAL = 'referral'
    SOURCE_OTHER = 'other'

    SOURCE_CHOICES = [
        (SOURCE_MANUAL, 'Manual'),
        (SOURCE_JSEARCH, 'JSearch'),
        (SOURCE_LINKEDIN, 'LinkedIn'),
        (SOURCE_INDEED, 'Indeed'),
        (SOURCE_COMPANY, 'Company Website'),
        (SOURCE_REFERRAL, 'Referral'),
        (SOURCE_OTHER, 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='job_applications',
        on_delete=models.CASCADE,
    )

    resume = models.ForeignKey(
        Resume,
        related_name='job_applications',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    analysis_report = models.ForeignKey(
        AnalysisReport,
        related_name='job_applications',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    job_title = models.CharField(max_length=255)
    company_name = models.CharField(max_length=255)
    location = models.CharField(max_length=255, blank=True)
    job_url = models.URLField(max_length=1200, blank=True)

    source = models.CharField(max_length=30, choices=SOURCE_CHOICES, default=SOURCE_MANUAL)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default=STATUS_SAVED)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default=PRIORITY_MEDIUM)

    employment_type = models.CharField(max_length=120, blank=True)
    salary = models.CharField(max_length=255, blank=True)

    job_description_snapshot = models.TextField(blank=True)
    notes = models.TextField(blank=True)

    date_saved = models.DateField(null=True, blank=True)
    date_applied = models.DateField(null=True, blank=True)
    deadline = models.DateField(null=True, blank=True)
    next_follow_up_date = models.DateField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    status_updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at', '-created_at']
        indexes = [
            models.Index(fields=['owner', 'status']),
            models.Index(fields=['owner', 'created_at']),
            models.Index(fields=['owner', 'next_follow_up_date']),
        ]

    def __str__(self) -> str:
        return f'{self.job_title} - {self.company_name}'

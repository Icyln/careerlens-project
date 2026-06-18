from django.contrib import admin

from .models import AnalysisReport, JobApplication, Resume

@admin.register(Resume)
class ResumeAdmin(admin.ModelAdmin):
    list_display = ['original_name', 'owner', 'file_type', 'file_size', 'uploaded_at']
    search_fields = ['original_name', 'owner__username', 'owner__email']
    list_filter = ['file_type', 'uploaded_at']


@admin.register(AnalysisReport)
class AnalysisReportAdmin(admin.ModelAdmin):
    list_display = ['job_title', 'resume', 'owner_username', 'created_at']
    search_fields = ['job_title', 'resume__original_name', 'resume__owner__username']
    list_filter = ['created_at']

    def owner_username(self, obj):
        return obj.resume.owner.username if obj.resume and obj.resume.owner else ''

@admin.register(JobApplication)
class JobApplicationAdmin(admin.ModelAdmin):
    list_display = [
        'job_title',
        'company_name',
        'owner',
        'status',
        'priority',
        'source',
        'date_applied',
        'next_follow_up_date',
        'updated_at',
    ]
    list_filter = [
        'status',
        'priority',
        'source',
        'date_applied',
        'next_follow_up_date',
        'created_at',
    ]
    search_fields = [
        'job_title',
        'company_name',
        'location',
        'owner__username',
        'owner__email',
    ]

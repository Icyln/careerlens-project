# Generated for CareerLens starter project.
import uuid
from django.db import migrations, models
import django.db.models.deletion
import resumes.models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='Resume',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('original_name', models.CharField(max_length=255)),
                ('file', models.FileField(upload_to=resumes.models.resume_upload_path)),
                ('file_size', models.PositiveBigIntegerField(default=0)),
                ('file_type', models.CharField(max_length=12)),
                ('extracted_text', models.TextField(blank=True)),
                ('parser_metadata', models.JSONField(blank=True, default=dict)),
                ('uploaded_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={'ordering': ['-uploaded_at']},
        ),
        migrations.CreateModel(
            name='AnalysisReport',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('job_title', models.CharField(max_length=255)),
                ('job_description', models.TextField()),
                ('ats_result', models.JSONField(default=dict)),
                ('ai_result', models.JSONField(default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('resume', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='reports', to='resumes.resume')),
            ],
            options={'ordering': ['-created_at']},
        ),
    ]

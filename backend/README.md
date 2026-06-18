# CareerLens Backend

Django REST backend for resume upload, resume update/delete, rule-based ATS scoring, Gemini AI analysis, MySQL storage, and PDF report export.

## Setup

```bash
cd backend
python -m venv .venv
source .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env
```

Set `GEMINI_API_KEY` in `.env` to enable Gemini AI analysis. The rule-based ATS engine works without Gemini.

## MySQL

Create the database manually or run the included MySQL service from the project root:

```bash
docker compose up -d mysql
```

Then run migrations and start the server:

```bash
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
```

## API

- `GET /api/resumes/` list resumes
- `POST /api/resumes/` upload resume with multipart field `file`
- `PATCH /api/resumes/{id}/` update/re-upload resume with multipart field `file`
- `DELETE /api/resumes/{id}/` delete resume file and database row
- `POST /api/analysis/` create ATS + Gemini analysis
- `GET /api/analysis/{id}/export-pdf/` download PDF report

Example analysis body:

```json
{
  "resume_id": "uuid",
  "job_title": "React Developer",
  "job_description": "Full job description text..."
}
```

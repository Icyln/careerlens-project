# CareerLens Full-Stack Starter

CareerLens is a React + Tailwind frontend and Django REST + MySQL backend for resume upload, resume management, rule-based ATS scoring, Gemini AI analysis, and PDF report export.

## Features implemented

- Resume Page
  - Upload PDF/DOCX resume
  - Store resume metadata in the database
  - Store file in Django media storage
  - Show uploaded resume file name, file size, uploaded date/time, file type, and parser warnings
  - Update button to re-upload a different resume file
  - Delete Resume button to remove file and database record
  - Check ATS & Analysis button to open the ATS page with that resume selected

- ATS & Analysis Page
  - Resume selector, with automatic selection when only one resume exists
  - Job Title field
  - Job Description textarea
  - Rule-based ATS score independent from AI
  - Section-by-section scoring for keyword matches, contact information, work experience/education, and layout/formatting
  - Average ATS percentage and match level
  - Gemini AI analysis independent from ATS
  - AI summary, matched skills, missing skills, strengths, weaknesses, alignment explanation, recommendations, and visualization bars
  - Export report as PDF
  - Tailor Your Resume button and tailoring panel

## Run with MySQL

From the project root:

```bash
docker compose up -d mysql
```

Backend:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
```

Frontend:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173`.

## Notes

- ATS scoring is a deterministic rule-based engine in `backend/resumes/services/ats_engine.py`.
- Gemini AI analysis is in `backend/resumes/services/ai_engine.py` and is disabled until `GEMINI_API_KEY` is added to `backend/.env`.
- Uploaded files are served from Django `MEDIA_ROOT` during local development.
- For production, configure a real static/media storage strategy, HTTPS, authentication, authorization, rate limits, and virus scanning for uploads.

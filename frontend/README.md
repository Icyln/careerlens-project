# CareerLens Frontend

React + Tailwind CSS frontend for resume upload, resume management, ATS analysis, Gemini AI analysis display, and report PDF export.

## Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173`.

The frontend expects the Django backend at `VITE_API_BASE_URL=http://127.0.0.1:8000/api`.

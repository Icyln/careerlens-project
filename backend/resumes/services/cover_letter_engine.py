from __future__ import annotations

import json
import re
from typing import Any

from django.conf import settings

try:
    from google import genai
    from google.genai import types
except Exception:  # pragma: no cover
    genai = None
    types = None


MAX_RESUME_CHARS = 12000
MAX_JOB_DESCRIPTION_CHARS = 8000

DEFAULT_COVER_LETTER_RESULT: dict[str, Any] = {
    'engine': 'gemini_cover_letter',
    'status': 'unavailable',
    'subject_line': '',
    'cover_letter': '',
    'opening_hook': '',
    'highlighted_strengths': [],
    'keywords_used': [],
    'missing_info': [],
    'safety_notes': [],
    'next_steps': [],
    'candidate_name': '',
    'word_count': 0,
    'message': '',
}


def _clean_string(value: Any) -> str:
    if value is None:
        return ''

    if isinstance(value, str):
        return re.sub(r'\s+', ' ', value).strip()

    if isinstance(value, (int, float, bool)):
        return str(value)

    return re.sub(r'\s+', ' ', str(value)).strip()


def _clean_multiline(value: Any) -> str:
    if value is None:
        return ''

    text = str(value).replace('\r\n', '\n').replace('\r', '\n')
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)

    return text.strip()


def _listify(value: Any) -> list[str]:
    if value is None or value == '':
        return []

    values = value if isinstance(value, list) else [value]
    output: list[str] = []
    seen: set[str] = set()

    for item in values:
        if isinstance(item, dict):
            text = _clean_string(
                item.get('text')
                or item.get('keyword')
                or item.get('skill')
                or item.get('strength')
                or item.get('note')
                or item.get('reason')
                or item.get('value')
            )
        else:
            text = _clean_string(item)

        key = text.lower()

        if text and key not in seen:
            output.append(text)
            seen.add(key)

    return output


def _truncate(text: str, limit: int) -> str:
    text = text or ''

    if len(text) <= limit:
        return text

    return text[:limit] + '\n[Text truncated for cover letter context length.]'


def _strip_json_code_fence(text: str) -> str:
    text = (text or '').strip()

    if text.startswith('```'):
        text = re.sub(r'^```(?:json)?', '', text, flags=re.IGNORECASE).strip()
        text = re.sub(r'```$', '', text).strip()

    first = text.find('{')
    last = text.rfind('}')

    if first != -1 and last != -1 and last > first:
        return text[first:last + 1]

    return text


def _format_candidate_name(name: str) -> str:
    name = _clean_string(name)

    if not name:
        return ''

    # Convert resume names like "HTUN MYAT HTUN" to "Htun Myat Htun".
    if name.isupper():
        return name.title()

    return name


def _extract_candidate_name(resume_text: str) -> str:
    text = resume_text or ''

    # First check explicit labels like "Name: Natasha Gupta".
    label_match = re.search(
        r'(?im)^\s*(?:name|full name)\s*[:\-]\s*([A-Za-z][A-Za-z\s.\'-]{2,60})\s*$',
        text,
    )

    if label_match:
        candidate = re.sub(r'[^A-Za-z .\'-]', '', label_match.group(1)).strip()
        words = candidate.split()

        if 2 <= len(words) <= 5:
            return _format_candidate_name(candidate)

    lines = [
        _clean_string(line)
        for line in text.splitlines()
        if _clean_string(line)
    ]

    bad_words = {
        'resume',
        'curriculum vitae',
        'cv',
        'email',
        'phone',
        'address',
        'linkedin',
        'github',
        'portfolio',
        'summary',
        'profile',
        'experience',
        'education',
        'skills',
        'certifications',
        'projects',
        'objective',
        'developer',
        'engineer',
        'server',
        'assistant',
        'manager',
        'designer',
        'technician',
        'specialist',
        'student',
        'intern',
    }

    for line in lines[:15]:
        # If contact info is on the same line, take only the first segment.
        first_part = re.split(r'\s*[|•]\s*', line)[0].strip()
        clean = re.sub(r'[^A-Za-z .\'-]', '', first_part).strip()
        words = clean.split()

        if not (2 <= len(words) <= 5):
            continue

        lower = clean.lower()

        if any(word in lower for word in bad_words):
            continue

        if '@' in line or 'http' in lower or 'www.' in lower:
            continue

        if re.search(r'\d', line):
            continue

        # Accept Title Case or ALL CAPS names.
        if all(word[:1].isupper() for word in words if word):
            return _format_candidate_name(clean)

    return ''


def _clean_subject_line(subject_line: str, candidate_name: str = '') -> str:
    subject_line = _clean_string(subject_line)
    candidate_name = _format_candidate_name(candidate_name)

    if not subject_line:
        return ''

    # Remove placeholder names from subject lines.
    subject_line = re.sub(
        r'\s*[-–—|:]\s*\[(?:your name|candidate name|name)\]\s*',
        '',
        subject_line,
        flags=re.IGNORECASE,
    )

    subject_line = re.sub(
        r'\[(?:your name|candidate name|name)\]',
        '',
        subject_line,
        flags=re.IGNORECASE,
    )

    # If Gemini adds the candidate name at the end of the subject, remove it.
    # Example: "Application for Server Position - Htun Myat Htun"
    if candidate_name:
        subject_line = re.sub(
            rf'\s*[-–—|:]\s*{re.escape(candidate_name)}\s*$',
            '',
            subject_line,
            flags=re.IGNORECASE,
        )

    subject_line = re.sub(r'\s{2,}', ' ', subject_line).strip()
    subject_line = re.sub(r'\s*[-–—|:]\s*$', '', subject_line).strip()

    return subject_line


def _ensure_signature_name(cover_letter: str, candidate_name: str) -> str:
    cover_letter = _clean_multiline(cover_letter)
    candidate_name = _format_candidate_name(candidate_name)

    if not cover_letter:
        return cover_letter

    if candidate_name:
        cover_letter = re.sub(
            r'\[(?:your name|candidate name|name)\]',
            candidate_name,
            cover_letter,
            flags=re.IGNORECASE,
        )
    else:
        cover_letter = re.sub(
            r'\[(?:your name|candidate name|name)\]',
            '',
            cover_letter,
            flags=re.IGNORECASE,
        )

    closing_pattern = r'(?:best regards|kind regards|sincerely|regards)'

    if candidate_name:
        cover_letter = re.sub(
            rf'\s*{closing_pattern},?\s+{re.escape(candidate_name)}\s*$',
            '',
            cover_letter,
            flags=re.IGNORECASE,
        )
    else:
        # If we do not have a candidate name, remove any ending signature-like text.
        cover_letter = re.sub(
            rf'\s*{closing_pattern},?\s*(?:[A-Za-z][A-Za-z\s.\'-]{{2,60}})?\s*$',
            '',
            cover_letter,
            flags=re.IGNORECASE,
        )

    # Remove leftover ending closings like "Sincerely,".
    cover_letter = re.sub(
        rf'\s*{closing_pattern},?\s*$',
        '',
        cover_letter,
        flags=re.IGNORECASE,
    )

    cover_letter = _clean_multiline(cover_letter)

    if candidate_name:
        return f'{cover_letter}\n\nSincerely,\n{candidate_name}'.strip()

    return f'{cover_letter}\n\nSincerely,'.strip()


def _merge_result(
    payload: dict[str, Any],
    status: str = 'success',
    candidate_name: str = '',
) -> dict[str, Any]:
    result = json.loads(json.dumps(DEFAULT_COVER_LETTER_RESULT))
    result.update(payload or {})

    clean_candidate_name = (
        _format_candidate_name(result.get('candidate_name'))
        or _format_candidate_name(candidate_name)
    )

    result['engine'] = 'gemini_cover_letter'
    result['status'] = status
    result['subject_line'] = _clean_subject_line(
        result.get('subject_line'),
        clean_candidate_name,
    )
    result['candidate_name'] = clean_candidate_name
    result['cover_letter'] = _clean_multiline(result.get('cover_letter'))
    result['cover_letter'] = _ensure_signature_name(
        result['cover_letter'],
        clean_candidate_name,
    )
    result['opening_hook'] = _clean_string(result.get('opening_hook'))
    result['highlighted_strengths'] = _listify(result.get('highlighted_strengths'))
    result['keywords_used'] = _listify(result.get('keywords_used'))
    result['missing_info'] = _listify(result.get('missing_info'))
    result['safety_notes'] = _listify(result.get('safety_notes'))
    result['next_steps'] = _listify(result.get('next_steps'))
    result['word_count'] = len(re.findall(r'\b\w+\b', result['cover_letter']))
    result['message'] = _clean_string(result.get('message'))

    return result


def _is_quota_or_rate_error(error: Exception) -> bool:
    message = str(error).lower()

    return any(
        keyword in message
        for keyword in [
            '429',
            'quota',
            'rate limit',
            'resource_exhausted',
            'too many requests',
            'exceeded',
        ]
    )


def _safe_keywords(focus_keywords: list[str] | None, job_description: str) -> list[str]:
    keywords = _listify(focus_keywords)

    common_terms = [
        'customer service',
        'communication',
        'teamwork',
        'attention to detail',
        'problem solving',
        'time management',
        'leadership',
        'food safety',
        'restaurant service',
        'frontend development',
        'react',
        'javascript',
        'python',
        'data analysis',
        'project management',
    ]

    jd_lower = (job_description or '').lower()

    for term in common_terms:
        if term in jd_lower and term not in [item.lower() for item in keywords]:
            keywords.append(term.title())

    return keywords[:8]


def _fallback_cover_letter(
    *,
    resume_text: str,
    job_title: str,
    job_description: str,
    company_name: str = '',
    hiring_manager: str = '',
    candidate_name: str = '',
    tone: str = 'professional',
    length: str = 'standard',
    focus_keywords: list[str] | None = None,
    user_notes: str = '',
    message: str = '',
) -> dict[str, Any]:
    clean_job_title = _clean_string(job_title) or 'the role'
    clean_company = _clean_string(company_name)
    clean_manager = _clean_string(hiring_manager)
    clean_candidate_name = _format_candidate_name(candidate_name) or _extract_candidate_name(resume_text)

    signature = f'Sincerely,\n{clean_candidate_name}' if clean_candidate_name else 'Sincerely,'
    greeting = f'Dear {clean_manager},' if clean_manager else 'Dear Hiring Manager,'

    company_phrase = f' at {clean_company}' if clean_company else ''
    subject_company = f' at {clean_company}' if clean_company else ''

    keywords = _safe_keywords(focus_keywords, job_description)

    if keywords:
        keyword_sentence = (
            'The role appears to value '
            + ', '.join(keywords[:5])
            + ', and I would be careful to connect these requirements with truthful examples from my resume.'
        )
    else:
        keyword_sentence = (
            'The role appears to require a reliable candidate who can communicate clearly, learn quickly, '
            'and contribute professionally to the team.'
        )

    if length == 'short':
        body = f"""{greeting}

I am writing to express my interest in the {clean_job_title} position{company_phrase}. Based on my resume and the job description, I believe this role is a strong match for my experience, work ethic, and interest in contributing to a professional team.

{keyword_sentence} My background shows that I can take responsibility, follow workplace expectations, and support day-to-day tasks with care and consistency.

Thank you for considering my application. I would appreciate the opportunity to discuss how my experience can support the needs of this role.

{signature}"""
    else:
        body = f"""{greeting}

I am writing to express my interest in the {clean_job_title} position{company_phrase}. After reviewing the job description, I am interested in the opportunity because it aligns with my resume background, my practical experience, and my ability to contribute in a professional working environment.

{keyword_sentence} I am especially careful about presenting my experience honestly, so this draft focuses only on skills and qualities that should be verified against the resume before submission.

In my previous experience, I have developed a strong sense of responsibility, attention to detail, and communication. I understand the importance of being dependable, following instructions, learning from feedback, and supporting the goals of the team. These qualities would help me adapt to the expectations of the {clean_job_title} role and contribute positively from the start.

Thank you for considering my application. I would welcome the opportunity to discuss how my background and motivation can support the needs of this position.

{signature}"""

    return _merge_result(
        {
            'subject_line': f'Application for {clean_job_title}{subject_company}',
            'opening_hook': f'I am writing to express my interest in the {clean_job_title} position{company_phrase}.',
            'cover_letter': body,
            'candidate_name': clean_candidate_name,
            'highlighted_strengths': [
                'Generated using a safe fallback draft because Gemini was unavailable.',
                'Uses the selected job title and company details when provided.',
                'Avoids unsupported claims about experience, degrees, certifications, or achievements.',
            ],
            'keywords_used': keywords,
            'missing_info': [
                'Review the letter and add one specific achievement from the resume if available.',
                'Add the hiring manager name if the job posting provides it.',
                'Verify that every keyword and claim is supported by the original resume.',
            ],
            'safety_notes': [
                'This is a fallback draft, not a full Gemini-generated letter.',
                'No fake experience, certifications, degrees, or employers were added.',
                'Please review before submitting to an employer.',
            ],
            'next_steps': [
                'Edit the opening paragraph to make it more personal.',
                'Add one truthful example from your resume.',
                'Download as PDF or DOCX after reviewing.',
            ],
            'message': message or 'Gemini was unavailable, so CareerLens created a safe fallback cover letter draft.',
        },
        status='fallback',
        candidate_name=clean_candidate_name,
    )


def _build_prompt(
    *,
    resume_text: str,
    job_title: str,
    job_description: str,
    company_name: str = '',
    hiring_manager: str = '',
    candidate_name: str = '',
    tone: str = 'professional',
    length: str = 'standard',
    focus_keywords: list[str] | None = None,
    user_notes: str = '',
) -> str:
    focus_keywords = focus_keywords or []

    length_rule = {
        'short': 'Write 180-230 words, 3 concise paragraphs.',
        'standard': 'Write 260-340 words, 4 concise paragraphs.',
        'detailed': 'Write 360-450 words, 4-5 paragraphs.',
    }.get(length, 'Write 260-340 words, 4 concise paragraphs.')

    candidate_name = _format_candidate_name(candidate_name) or _extract_candidate_name(resume_text)
    required_signature = f'Sincerely,\n{candidate_name}' if candidate_name else 'Sincerely,'

    return f"""
You are CareerLens Cover Letter Writer. Generate a truthful, recruiter-ready cover letter using only the candidate resume and the job description.

Critical safety rules:
- Do not invent experience, employers, degrees, certifications, years of experience, tools, achievements, awards, or metrics.
- If a detail is not clearly supported by the resume, do not claim it as fact.
- You may phrase transferable experience professionally, but it must remain truthful.
- Do not include placeholders such as [Company], [Hiring Manager], [Your Name], or [Candidate Name].
- If company or hiring manager is missing, write naturally without placeholders.
- Avoid generic AI-sounding phrases.
- Make it specific, polished, and human.
- Do not mention ATS score.
- Do not mention that AI wrote the letter.
- The cover_letter must start with a greeting.
- If a hiring manager name is provided, start with: Dear {hiring_manager},
- If no hiring manager name is provided, start exactly with: Dear Hiring Manager,
- The cover_letter must end with a professional signature on separate lines.
- If the candidate name is clearly available, end exactly with:
  Sincerely,
  {candidate_name}
- If the candidate name is not clearly available, end with:
  Sincerely,
- Never place "Sincerely" inside the last paragraph.
- Never write "Sincerely, {candidate_name}" on one line.
- Do not invent a candidate name.
- Do not include the candidate name in the subject_line.

Return only valid JSON with exactly these keys:
- subject_line: short email subject for sending the cover letter.
- opening_hook: one strong opening sentence from the letter.
- cover_letter: the full cover letter as plain text with paragraph breaks.
- highlighted_strengths: array of 3-6 short strings explaining strongest evidence used.
- keywords_used: array of role keywords included truthfully.
- missing_info: array of useful missing details the candidate may want to add manually.
- safety_notes: array of 2-4 short notes about truthfulness or review reminders.
- next_steps: array of 2-4 practical follow-up actions.
- candidate_name: the candidate name extracted from the resume, or empty string if unavailable.

Style:
Tone: {tone}
Length: {length_rule}
Target role: {job_title}
Company: {company_name or 'Not provided'}
Hiring manager: {hiring_manager or 'Not provided'}
Focus keywords requested by user: {', '.join(focus_keywords) if focus_keywords else 'None'}
User notes: {user_notes or 'None'}
Candidate name from resume: {candidate_name or 'Not clearly found'}
Required greeting: {'Dear ' + hiring_manager + ',' if hiring_manager else 'Dear Hiring Manager,'}
Required signature:
{required_signature}

Job description:
{_truncate(job_description, MAX_JOB_DESCRIPTION_CHARS)}

Resume text:
{_truncate(resume_text, MAX_RESUME_CHARS)}
""".strip()


def generate_cover_letter(
    *,
    resume_text: str,
    job_title: str,
    job_description: str,
    company_name: str = '',
    hiring_manager: str = '',
    candidate_name: str = '',
    tone: str = 'professional',
    length: str = 'standard',
    focus_keywords: list[str] | None = None,
    user_notes: str = '',
) -> dict[str, Any]:
    candidate_name = _format_candidate_name(candidate_name) or _extract_candidate_name(resume_text)

    api_key = (
        getattr(settings, 'GEMINI_COVER_LETTER_API_KEY', '')
        or getattr(settings, 'GEMINI_API_KEY', '')
    )

    if not api_key:
        return _fallback_cover_letter(
            resume_text=resume_text,
            job_title=job_title,
            job_description=job_description,
            company_name=company_name,
            hiring_manager=hiring_manager,
            candidate_name=candidate_name,
            tone=tone,
            length=length,
            focus_keywords=focus_keywords,
            user_notes=user_notes,
            message='GEMINI_API_KEY is not configured, so CareerLens created a safe fallback cover letter draft.',
        )

    if genai is None or types is None:
        return _fallback_cover_letter(
            resume_text=resume_text,
            job_title=job_title,
            job_description=job_description,
            company_name=company_name,
            hiring_manager=hiring_manager,
            candidate_name=candidate_name,
            tone=tone,
            length=length,
            focus_keywords=focus_keywords,
            user_notes=user_notes,
            message='google-genai is not installed, so CareerLens created a safe fallback cover letter draft.',
        )

    model = (
        getattr(settings, 'GEMINI_COVER_LETTER_MODEL', '')
        or getattr(settings, 'GEMINI_MODEL', '')
        or 'gemini-2.5-flash-lite'
    )

    try:
        client = genai.Client(api_key=api_key)

        response = client.models.generate_content(
            model=model,
            contents=_build_prompt(
                resume_text=resume_text,
                job_title=job_title,
                job_description=job_description,
                company_name=company_name,
                hiring_manager=hiring_manager,
                candidate_name=candidate_name,
                tone=tone,
                length=length,
                focus_keywords=focus_keywords,
                user_notes=user_notes,
            ),
            config=types.GenerateContentConfig(
                temperature=0.25,
                response_mime_type='application/json',
            ),
        )

        text = getattr(response, 'text', '') or ''
        payload = json.loads(_strip_json_code_fence(text))

        if not isinstance(payload, dict):
            raise ValueError('Gemini returned JSON that is not an object.')

        return _merge_result(
            payload,
            status='success',
            candidate_name=candidate_name,
        )

    except Exception as exc:
        if _is_quota_or_rate_error(exc):
            message = 'Gemini quota or rate limit was reached, so CareerLens created a safe fallback cover letter draft.'
        else:
            message = 'Gemini could not generate the cover letter, so CareerLens created a safe fallback cover letter draft.'

        return _fallback_cover_letter(
            resume_text=resume_text,
            job_title=job_title,
            job_description=job_description,
            company_name=company_name,
            hiring_manager=hiring_manager,
            candidate_name=candidate_name,
            tone=tone,
            length=length,
            focus_keywords=focus_keywords,
            user_notes=user_notes,
            message=message,
        )
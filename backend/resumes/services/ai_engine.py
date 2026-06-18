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

MAX_RESUME_CHARS = 14000
MAX_JOB_DESCRIPTION_CHARS = 9000

DEFAULT_AI_RESULT: dict[str, Any] = {
    'engine': 'gemini_ai',
    'status': 'unavailable',
    'summary_10_second_read': '',
    'matched_skills': [],
    'missing_skills': [],
    'strengths': [],
    'weaknesses': [],
    'alignment_explanation': {
        'level': 'Unknown',
        'explanation': 'AI analysis was not generated.',
    },
    'recommendations': [],
    'tailoring_suggestions': [],
    'visualization': [],
    'message': '',
}


def truncate(text: str, limit: int) -> str:
    text = text or ''
    if len(text) <= limit:
        return text
    return text[:limit] + '\n[Text truncated for AI context length.]'


def strip_json_code_fence(text: str) -> str:
    text = (text or '').strip()
    if text.startswith('```'):
        text = re.sub(r'^```(?:json)?', '', text, flags=re.IGNORECASE).strip()
        text = re.sub(r'```$', '', text).strip()
    first = text.find('{')
    last = text.rfind('}')
    if first != -1 and last != -1 and last > first:
        return text[first:last + 1]
    return text


def humanize_ai_item(item: Any, preferred_keys: list[str] | None = None) -> str:
    """Convert Gemini list items into user-friendly plain text.

    Gemini may return objects even when we ask for strings. The frontend should never
    show raw JSON, so the backend normalizes common object shapes here.
    """
    if item is None:
        return ''
    if isinstance(item, str):
        return item.strip()
    if isinstance(item, (int, float, bool)):
        return str(item)
    if isinstance(item, list):
        return ', '.join(filter(None, (humanize_ai_item(value, preferred_keys) for value in item))).strip()
    if isinstance(item, dict):
        keys = preferred_keys or ['strength', 'weakness', 'skill', 'name', 'title', 'recommendation', 'suggestion', 'action', 'requirement', 'text', 'label', 'value', 'explanation', 'reason']
        for key in keys:
            value = item.get(key)
            if value:
                return humanize_ai_item(value, preferred_keys).strip()
        values = [humanize_ai_item(value, preferred_keys) for key, value in item.items() if str(key).lower() not in {'evidence'}]
        return ' - '.join(value for value in values if value).strip()
    return str(item).strip()


def normalize_ai_list(value: Any, preferred_keys: list[str] | None = None) -> list[str]:
    if value is None or value == '':
        return []
    items = value if isinstance(value, list) else [value]
    clean: list[str] = []
    for item in items:
        text = humanize_ai_item(item, preferred_keys)
        if text and text not in clean:
            clean.append(text)
    return clean


def merge_with_defaults(payload: dict[str, Any], status: str = 'success') -> dict[str, Any]:
    result = json.loads(json.dumps(DEFAULT_AI_RESULT))
    result.update(payload or {})
    result['engine'] = 'gemini_ai'
    result['status'] = status
    if not isinstance(result.get('alignment_explanation'), dict):
        result['alignment_explanation'] = DEFAULT_AI_RESULT['alignment_explanation']
    result['matched_skills'] = normalize_ai_list(result.get('matched_skills'), ['skill', 'name', 'title', 'label', 'text', 'value'])
    result['missing_skills'] = normalize_ai_list(result.get('missing_skills'), ['skill', 'name', 'title', 'requirement', 'label', 'text', 'value'])
    result['strengths'] = normalize_ai_list(result.get('strengths'), ['strength', 'title', 'text', 'name', 'value'])
    result['weaknesses'] = normalize_ai_list(result.get('weaknesses'), ['weakness', 'gap', 'title', 'text', 'name', 'value'])
    result['recommendations'] = normalize_ai_list(result.get('recommendations'), ['recommendation', 'suggestion', 'action', 'text', 'title', 'value'])
    result['tailoring_suggestions'] = normalize_ai_list(result.get('tailoring_suggestions'), ['suggestion', 'action', 'recommendation', 'text', 'title', 'value'])
    if not isinstance(result.get('visualization'), list):
        result['visualization'] = []
    return result


def build_prompt(resume_text: str, job_title: str, job_description: str) -> str:
    return f"""
You are CareerLens AI Analysis Engine. Analyze the resume against the job description for human hiring usefulness, recruiter review, and company-side understanding.
Important separation rule: Do not calculate or mention an ATS score. Do not tell the user these items will improve ATS ranking. The ATS score is produced by a separate strict rule-based engine using exact keyword/title checks. Your output must be independent and based only on the resume text, job title, and job description below.

Return only valid JSON with exactly these top-level keys:
- summary_10_second_read: one short paragraph that a recruiter can read in about 10 seconds.
- matched_skills: array of short plain strings only.
- missing_skills: array of short plain strings only.
- strengths: array of clear human-readable plain strings only. Do not return objects. Do not use the word evidence.
- weaknesses: array of clear human-readable plain strings only. Do not return objects. Do not use the word evidence.
- alignment_explanation: object with keys level and explanation only. Level must be one of Low, Fair, Moderate, High, Excellent.
- recommendations: array of practical human-review improvement strings only.
- tailoring_suggestions: array of specific human-review tailoring action strings only. Do not invent false experience.
- visualization: array of objects with keys label, value, reason. Value must be a number from 0 to 100 for simple UI bars.

Formatting rule: Never return nested objects inside strengths, weaknesses, matched_skills, missing_skills, recommendations, or tailoring_suggestions. These arrays must contain readable strings only.

Job title:
{job_title}

Job description:
{truncate(job_description, MAX_JOB_DESCRIPTION_CHARS)}

Resume text:
{truncate(resume_text, MAX_RESUME_CHARS)}
""".strip()


def local_unavailable_result(message: str) -> dict[str, Any]:
    return merge_with_defaults(
        {
            'summary_10_second_read': 'Gemini AI analysis is not available for this request. The rule-based ATS report can still be used independently.',
            'alignment_explanation': {
                'level': 'Unknown',
                'explanation': message,
                },
            'recommendations': [
                'Add a Gemini API key to enable recruiter-style AI analysis.',
                'Use the rule-based ATS section scores to identify technical keyword, contact, experience, education, and formatting issues.',
            ],
            'message': message,
        },
        status='unavailable',
    )


def generate_ai_analysis(resume_text: str, job_title: str, job_description: str) -> dict[str, Any]:
    if not settings.GEMINI_API_KEY:
        return local_unavailable_result('GEMINI_API_KEY is not configured on the backend.')
    if genai is None or types is None:
        return local_unavailable_result('google-genai is not installed in the backend environment.')

    try:
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=build_prompt(resume_text, job_title, job_description),
            config=types.GenerateContentConfig(
                temperature=0.25,
                response_mime_type='application/json',
            ),
        )
        text = getattr(response, 'text', '') or ''
        payload = json.loads(strip_json_code_fence(text))
        if not isinstance(payload, dict):
            raise ValueError('Gemini returned JSON that is not an object.')
        return merge_with_defaults(payload, status='success')
    except Exception as exc:
        return merge_with_defaults(
            {
                'summary_10_second_read': 'AI analysis could not be generated for this request, but the ATS report was completed independently.',
                'alignment_explanation': {
                    'level': 'Unknown',
                    'explanation': f'Gemini request failed: {exc}',
                },
                'recommendations': ['Check the backend logs, GEMINI_API_KEY, model name, and network/API quota settings.'],
                'message': str(exc),
            },
            status='error',
        )


DEFAULT_TAILOR_RESULT: dict[str, Any] = {
    'engine': 'gemini_tailor_resume',
    'status': 'unavailable',
    'template': 'classic_ats',
    'tailored_resume_text': '',
    'structured_resume': {},
    'included_keywords': [],
    'not_included_keywords': [],
    'unconfirmed_keywords': [],
    'change_summary': [],
    'safety_notes': [],
    'message': '',
}


def _clean_string(value: Any) -> str:
    if value is None:
        return ''
    if isinstance(value, str):
        return re.sub(r'\s+', ' ', value).strip()
    if isinstance(value, (int, float, bool)):
        return str(value)
    return humanize_ai_item(value).strip()


def _fix_spaced_name(name: str) -> str:
    clean = re.sub(r'\s+', ' ', name or '').strip()
    parts = clean.split()
    if len(parts) >= 6 and all(len(part) == 1 and part.isalpha() for part in parts):
        # N A N G M Y A T -> NANG MYAT is impossible to reconstruct perfectly without
        # original text, so fallback to compact groups of 4 only when Gemini letter-spaced.
        return ''.join(parts)
    return clean


def _listify(value: Any) -> list[Any]:
    if value is None or value == '':
        return []
    if isinstance(value, list):
        return value
    return [value]


def _format_bullets(value: Any) -> list[str]:
    output: list[str] = []
    for item in _listify(value):
        if isinstance(item, dict):
            for key in ['bullet', 'text', 'description', 'summary', 'content', 'responsibility', 'achievement']:
                if item.get(key):
                    output.extend(_format_bullets(item.get(key)))
                    break
            else:
                text = humanize_ai_item(item)
                if text:
                    output.append(text)
        elif isinstance(item, list):
            output.extend(_format_bullets(item))
        else:
            text = _clean_string(item)
            if text:
                output.append(re.sub(r'^[-•]\s*', '', text))
    # preserve order, remove duplicates
    result: list[str] = []
    seen: set[str] = set()
    for item in output:
        key = item.lower()
        if item and key not in seen:
            result.append(item)
            seen.add(key)
    return result


def _format_work_item(item: Any) -> dict[str, Any]:
    if isinstance(item, str):
        return {'title': item.strip(), 'company': '', 'location': '', 'dates': '', 'bullets': []}
    if not isinstance(item, dict):
        return {'title': _clean_string(item), 'company': '', 'location': '', 'dates': '', 'bullets': []}
    return {
        'title': _clean_string(item.get('title') or item.get('role') or item.get('position') or item.get('job_title')),
        'company': _clean_string(item.get('company') or item.get('employer') or item.get('organization')),
        'location': _clean_string(item.get('location')),
        'dates': _clean_string(item.get('dates') or item.get('date') or item.get('period') or item.get('duration')),
        'bullets': _format_bullets(item.get('bullets') or item.get('responsibilities') or item.get('achievements') or item.get('content')),
    }


def _format_project_item(item: Any) -> dict[str, Any]:
    if isinstance(item, str):
        return {'name': item.strip(), 'bullets': []}
    if not isinstance(item, dict):
        return {'name': _clean_string(item), 'bullets': []}
    return {
        'name': _clean_string(item.get('name') or item.get('title') or item.get('project')),
        'bullets': _format_bullets(item.get('bullets') or item.get('description') or item.get('details') or item.get('content')),
    }


def _format_education_item(item: Any) -> dict[str, str]:
    if isinstance(item, str):
        return {'institution': item.strip(), 'degree': '', 'dates': '', 'location': ''}
    if not isinstance(item, dict):
        return {'institution': _clean_string(item), 'degree': '', 'dates': '', 'location': ''}
    return {
        'institution': _clean_string(item.get('institution') or item.get('school') or item.get('university') or item.get('college')),
        'degree': _clean_string(item.get('degree') or item.get('qualification') or item.get('program')),
        'dates': _clean_string(item.get('dates') or item.get('date') or item.get('period')),
        'location': _clean_string(item.get('location')),
    }


def _format_additional_section(item: Any) -> dict[str, Any]:
    if isinstance(item, str):
        return {'heading': 'Additional Information', 'content': [item.strip()]}
    if not isinstance(item, dict):
        return {'heading': 'Additional Information', 'content': [_clean_string(item)]}
    return {
        'heading': _clean_string(item.get('heading') or item.get('title') or item.get('name') or 'Additional Information'),
        'content': _format_bullets(item.get('content') or item.get('items') or item.get('bullets') or item.get('text')),
    }


def normalize_structured_resume(value: Any) -> dict[str, Any]:
    data = value if isinstance(value, dict) else {}
    contact = data.get('contact') if isinstance(data.get('contact'), dict) else {}

    raw_education = [
        _format_education_item(item)
        for item in _listify(data.get('education'))
    ]

    raw_certifications = _format_bullets(
        data.get('certifications') or data.get('certificates')
    )

    clean_education: list[dict[str, str]] = []
    clean_certifications: list[str] = list(raw_certifications)

    for item in raw_education:
        institution = _clean_string(item.get('institution'))
        degree = _clean_string(item.get('degree'))
        dates = _clean_string(item.get('dates'))
        location = _clean_string(item.get('location'))

        combined = f'{institution} {degree}'.lower()

        if 'certificate' in combined or 'certification' in combined:
            cert_parts = []

            if degree:
                cert_parts.append(degree)
            if institution:
                cert_parts.append(institution)
            if location:
                cert_parts.append(location)
            if dates:
                cert_parts.append(dates)

            cert_text = ' — '.join(cert_parts)

            if cert_text:
                clean_certifications.append(cert_text)
        else:
            clean_education.append({
                'institution': institution,
                'degree': degree,
                'dates': dates,
                'location': location,
            })

    structured = {
        'full_name': _fix_spaced_name(
            _clean_string(data.get('full_name') or data.get('name'))
        ),
        'target_title': _clean_string(
            data.get('target_title') or data.get('title')
        ),
        'contact': {
            'email': _clean_string(contact.get('email')),
            'phone': _clean_string(contact.get('phone')),
            'location': _clean_string(contact.get('location')),
            'links': _format_bullets(contact.get('links')),
        },
        'professional_summary': _clean_string(
            data.get('professional_summary')
            or data.get('summary')
            or data.get('profile')
        ),
        'hard_skills': _format_bullets(data.get('hard_skills') or data.get('technical_skills')),
        'soft_skills': _format_bullets(data.get('soft_skills') or data.get('transferable_skills')),
        'skills': _format_bullets(data.get('skills')),
        'work_experience': [
            _format_work_item(item)
            for item in _listify(data.get('work_experience') or data.get('experience'))
        ],
        'projects': [
            _format_project_item(item)
            for item in _listify(data.get('projects'))
        ],
        'education': clean_education,
        'certifications': clean_certifications,
        'additional_sections': [
            _format_additional_section(item)
            for item in _listify(
                data.get('additional_sections') or data.get('additional_information')
            )
        ],
    }

    if not structured['hard_skills'] and not structured['soft_skills'] and structured['skills']:
        structured['hard_skills'] = structured['skills']

    structured['hard_skills'] = [
       item for item in structured['hard_skills'] if _clean_string(item)
    ]

    structured['soft_skills'] = [
       item for item in structured['soft_skills'] if _clean_string(item)
    ]

    structured['work_experience'] = [
        item
        for item in structured['work_experience']
        if item['title'] or item['company'] or item['bullets']
    ]

    structured['projects'] = [
        item
        for item in structured['projects']
        if item['name'] or item['bullets']
    ]

    structured['education'] = [
        item
        for item in structured['education']
        if item['institution'] or item['degree']
    ]

    structured['certifications'] = [
        item
        for item in structured['certifications']
        if _clean_string(item)
    ]

    structured['additional_sections'] = [
        item
        for item in structured['additional_sections']
        if item['heading'] or item['content']
    ]

    return structured

def render_tailored_resume_text(structured: dict[str, Any], fallback_text: str = '') -> str:
    structured = normalize_structured_resume(structured)
    lines: list[str] = []
    if structured.get('full_name'):
        lines.append(structured['full_name'].upper())
    if structured.get('target_title'):
        lines.append(structured['target_title'])
    contact = structured.get('contact') or {}
    contact_line = ' | '.join([value for value in [contact.get('email'), contact.get('phone'), contact.get('location'), *contact.get('links', [])] if value])
    if contact_line:
        lines.append(contact_line)
    if lines:
        lines.append('')

    def add_section(title: str, content: list[str] | str):
        nonlocal lines
        items = _format_bullets(content) if not isinstance(content, str) else [content.strip()] if content.strip() else []
        if not items:
            return
        lines.append(title)
        if len(items) == 1 and title == 'Professional Summary':
            lines.append(items[0])
        else:
            for item in items:
                lines.append(f'• {item}')
        lines.append('')

    add_section('Professional Summary', structured.get('professional_summary') or '')
    hard_skills = structured.get('hard_skills') or []
    soft_skills = structured.get('soft_skills') or []

    if hard_skills or soft_skills:
       lines.append('Skills')

       if hard_skills:
          lines.append('Hard Skills')
          for item in _format_bullets(hard_skills):
              lines.append(f'• {item}')
          lines.append('')

       if soft_skills:
          lines.append('Soft Skills')
          for item in _format_bullets(soft_skills):
              lines.append(f'• {item}')
          lines.append('')
    else:
       add_section('Skills', structured.get('skills') or [])

    if structured.get('work_experience'):
        lines.append('Work Experience')
        for item in structured['work_experience']:
            header = item.get('title') or 'Experience'
            meta = ' | '.join([v for v in [item.get('company'), item.get('location'), item.get('dates')] if v])
            lines.append(header if not meta else f'{header} — {meta}')
            for bullet in item.get('bullets') or []:
                lines.append(f'• {bullet}')
            lines.append('')

    if structured.get('projects'):
        lines.append('Projects')
        for item in structured['projects']:
            if item.get('name'):
                lines.append(item['name'])
            for bullet in item.get('bullets') or []:
                lines.append(f'• {bullet}')
            lines.append('')

    if structured.get('education'):
        lines.append('Education')
        for item in structured['education']:
            if item.get('institution'):
                lines.append(item['institution'])
            detail = ' | '.join([v for v in [item.get('degree'), item.get('location'), item.get('dates')] if v])
            if detail:
                lines.append(detail)
            lines.append('')

    add_section('Certifications', structured.get('certifications') or [])
    for section in structured.get('additional_sections') or []:
        add_section(section.get('heading') or 'Additional Information', section.get('content') or [])

    text = '\n'.join(lines).strip()
    return text or (fallback_text or '').strip()


SECTION_HEADINGS = {
    'contact': {'contact', 'contact information'},
    'summary': {'profile', 'summary', 'professional summary', 'about me'},
    'skills': {'skills', 'skill', 'skill me', 'tools', 'tools & platforms', 'additional skills', 'technical skills'},
    'work_experience': {'work experience', 'experience', 'professional experience', 'employment history'},
    'projects': {'projects', 'project experience', 'projects (e-learning content)'},
    'education': {'education', 'academic background'},
    'certifications': {'certifications', 'certificates', 'other'},
}


def build_resume_section_map(resume_text: str) -> dict[str, Any]:
    lines = [line.strip() for line in (resume_text or '').splitlines() if line.strip()]
    current = 'unclassified'
    sections: dict[str, list[str]] = {key: [] for key in ['contact', 'summary', 'skills', 'work_experience', 'projects', 'education', 'certifications', 'additional']}
    sections['unclassified'] = []
    flat_heading_map = {heading: key for key, values in SECTION_HEADINGS.items() for heading in values}
    for line in lines:
        normalized = re.sub(r'\s+', ' ', line.lower()).strip(' :')
        if normalized in flat_heading_map:
            current = flat_heading_map[normalized]
            continue
        # headings with parentheses, e.g. PROJECTS (E-LEARNING CONTENT)
        matched_heading = None
        for heading, key in flat_heading_map.items():
            if normalized.startswith(heading + ' '):
                matched_heading = key
                break
        if matched_heading:
            current = matched_heading
            if '(' in line and ')' in line and current == 'projects':
                sections[current].append(line)
            continue
        sections.setdefault(current, []).append(line)
    return {key: value[:80] for key, value in sections.items() if value}


def merge_tailor_defaults(payload: dict[str, Any], status: str = 'success') -> dict[str, Any]:
    result = json.loads(json.dumps(DEFAULT_TAILOR_RESULT))
    result.update(payload or {})
    result['engine'] = 'gemini_tailor_resume'
    result['status'] = status
    result['template'] = str(result.get('template') or 'classic_ats').strip() or 'classic_ats'
    result['structured_resume'] = normalize_structured_resume(result.get('structured_resume'))
    result['tailored_resume_text'] = render_tailored_resume_text(result['structured_resume'], str(result.get('tailored_resume_text') or ''))
    result['included_keywords'] = normalize_ai_list(result.get('included_keywords'), ['keyword', 'skill', 'name', 'text', 'value'])
    result['not_included_keywords'] = normalize_ai_list(result.get('not_included_keywords'), ['keyword', 'skill', 'name', 'reason', 'text', 'value'])
    result['unconfirmed_keywords'] = normalize_ai_list(result.get('unconfirmed_keywords'), ['keyword', 'skill', 'name', 'reason', 'text', 'value'])
    result['change_summary'] = normalize_ai_list(result.get('change_summary'), ['change', 'summary', 'text', 'value'])
    result['safety_notes'] = normalize_ai_list(result.get('safety_notes'), ['note', 'warning', 'text', 'value'])
    return result


def _ats_keyword_feedback(ats_result: dict[str, Any]) -> dict[str, list[str]]:
    summary = (ats_result or {}).get('summary') or {}
    title_match = summary.get('job_title_match') or {}
    experience_match = summary.get('experience_year_match') or {}
    education_match = summary.get('education_match') or {}
    return {
        'missing_hard_keywords': normalize_ai_list((summary.get('hard_skills') or {}).get('missing')),
        'missing_soft_keywords': normalize_ai_list((summary.get('soft_skills') or {}).get('missing')),
        'missing_job_title': normalize_ai_list(title_match.get('missing')),
        'missing_experience': normalize_ai_list(experience_match.get('missing') if experience_match.get('applied') else []),
        'missing_education': normalize_ai_list(education_match.get('missing') if education_match.get('applied') else []),
        'top_fixes': normalize_ai_list(summary.get('top_fixes')),
    }


def _confirmed_skill_keywords(confirmed_keywords: Any) -> list[str]:
    """Return user-confirmed hard/soft keywords that are safe to place in Skills."""
    if not confirmed_keywords:
        return []

    raw_items: list[Any] = []
    if isinstance(confirmed_keywords, dict):
        # Only hard/soft keywords belong in the Skills section. Title, education,
        # and experience confirmations are handled by their own resume fields.
        raw_items.extend(_listify(confirmed_keywords.get('hard')))
        raw_items.extend(_listify(confirmed_keywords.get('soft')))
    else:
        raw_items.extend(_listify(confirmed_keywords))

    cleaned: list[str] = []
    seen: set[str] = set()
    for item in raw_items:
        text = _clean_string(item)
        key = text.lower()
        if text and key not in seen:
            cleaned.append(text)
            seen.add(key)
    return cleaned


def _keyword_already_present(keyword: str, items: list[str]) -> bool:
    key = _clean_string(keyword).lower()
    return any(_clean_string(item).lower() == key for item in items)


def _remove_keyword_mentions(items: Any, keywords: list[str]) -> list[str]:
    keyword_keys = [_clean_string(keyword).lower() for keyword in keywords if _clean_string(keyword)]
    output: list[str] = []
    for item in normalize_ai_list(items):
        clean = _clean_string(item)
        item_key = clean.lower()
        if any(item_key == key or item_key.startswith(key + ':') or item_key.startswith(key + ' -') for key in keyword_keys):
            continue
        output.append(clean)
    return output


def ensure_confirmed_skill_keywords(result: dict[str, Any], confirmed_keywords: Any) -> dict[str, Any]:
    """Make selected hard/soft ATS keywords visible in Skills after Gemini returns.

    Gemini sometimes mentions a confirmed keyword in included_keywords but forgets to
    place it inside structured_resume.skills. Since the user has explicitly confirmed
    these hard/soft keywords as truthful, we add them deterministically to Skills.
    """
    skill_keywords = _confirmed_skill_keywords(confirmed_keywords)
    if not skill_keywords:
        return result

    structured = normalize_structured_resume(result.get('structured_resume'))
    hard_skills = _format_bullets(structured.get('hard_skills'))
    soft_skills = _format_bullets(structured.get('soft_skills'))
    fallback_skills = _format_bullets(structured.get('skills'))

    confirmed_hard = []
    confirmed_soft = []

    if isinstance(confirmed_keywords, dict):
        confirmed_hard = [_clean_string(item) for item in _listify(confirmed_keywords.get('hard')) if _clean_string(item)]
        confirmed_soft = [_clean_string(item) for item in _listify(confirmed_keywords.get('soft')) if _clean_string(item)]

    for keyword in confirmed_hard:
        if not _keyword_already_present(keyword, hard_skills):
           hard_skills.append(keyword)

    for keyword in confirmed_soft:
        if not _keyword_already_present(keyword, soft_skills):
           soft_skills.append(keyword)

    if not hard_skills and not soft_skills:
       for keyword in skill_keywords:
           if not _keyword_already_present(keyword, fallback_skills):
              fallback_skills.append(keyword)

    structured['hard_skills'] = hard_skills
    structured['soft_skills'] = soft_skills
    structured['skills'] = fallback_skills
    result['structured_resume'] = structured

    included = normalize_ai_list(result.get('included_keywords'))
    for keyword in skill_keywords:
        if not _keyword_already_present(keyword, included):
            included.append(keyword)
    result['included_keywords'] = included

    result['not_included_keywords'] = _remove_keyword_mentions(result.get('not_included_keywords'), skill_keywords)
    result['unconfirmed_keywords'] = _remove_keyword_mentions(result.get('unconfirmed_keywords'), skill_keywords)
    result['tailored_resume_text'] = render_tailored_resume_text(structured, str(result.get('tailored_resume_text') or ''))
    return result

def build_tailor_prompt(
    resume_text: str,
    job_title: str,
    job_description: str,
    ats_result: dict[str, Any],
    selected_template: str = 'classic_ats',
    confirmed_keywords: dict[str, list[str]] | None = None,
) -> str:
    feedback = _ats_keyword_feedback(ats_result)
    section_map = build_resume_section_map(resume_text)
    confirmed_keywords = confirmed_keywords or {}
    feedback_json = json.dumps(feedback, ensure_ascii=False, indent=2)
    confirmed_json = json.dumps(confirmed_keywords, ensure_ascii=False, indent=2)
    section_map_json = json.dumps(section_map, ensure_ascii=False, indent=2)
    template_labels = {
        'classic_ats': 'Classic ATS Template: simple one-column resume, clear headings, ATS-safe formatting.',
        'modern_professional': 'Modern Professional Template: polished but still ATS-friendly, concise summary and grouped skills.',
        'compact_graduate': 'Compact Graduate Template: best for students, fresh graduates, internships, projects, and limited work history.',
    }
    template_instruction = template_labels.get(selected_template, template_labels['classic_ats'])
    return f"""
You are CareerLens Resume Tailoring Engine.
Rewrite the user's existing resume for better alignment with the target job while preserving honesty and preserving useful content.

Selected template style:
{template_instruction}

Human confirmation rule:
The user confirmed only the keywords listed in USER-CONFIRMED KEYWORDS. You may use those confirmed keywords when they fit naturally. Do not add unconfirmed missing keywords as claimed skills, tools, degrees, certifications, job titles, experience length, companies, achievements, or responsibilities.
- Every user-confirmed hard skill/tool and soft skill should appear in structured_resume.skills when it is truthful and relevant.

Critical honesty and preservation rules:
- Do not invent skills, tools, degrees, certifications, companies, job titles, dates, years of experience, achievements, locations, or responsibilities that are not supported by the original resume text or explicitly confirmed by the user.
- Preserve all meaningful original work experience bullets and project bullets. Rewrite for clarity and ATS wording, but do not collapse Work Experience or Projects into only titles.
- Keep at least the same number of work experience bullets and project bullets when possible.
- Preserve contact details, education facts, company names, dates, locations, and project names exactly unless normalizing spacing/capitalization.
- Keep the candidate name in normal words. Do not letter-space names like N A N G M Y A T.
- Do not output JSON-looking strings inside any resume bullet or section.
- If a confirmed keyword cannot be included truthfully, list it in not_included_keywords with a short reason.
- List unconfirmed missing keywords in unconfirmed_keywords, not in the tailored resume.
- Do not promise to preserve the original PDF visual design.

Return only valid JSON with exactly these top-level keys:
- template: selected template key.
- tailored_resume_text: complete plain-text resume with headings and bullets.
- structured_resume: object with this exact structure:
  {{
    "full_name": "",
    "target_title": "",
    "contact": {{"email": "", "phone": "", "location": "", "links": []}},
    "professional_summary": "",
    "hard_skills": ["plain strings only"],
    "soft_skills": ["plain strings only"],
    "skills": ["plain strings only, only use this as fallback if unsure"],
    "work_experience": [{{"title": "", "company": "", "location": "", "dates": "", "bullets": ["plain strings only"]}}],
    "projects": [{{"name": "", "bullets": ["plain strings only"]}}],
    "education": [{{"institution": "", "degree": "", "dates": "", "location": ""}}],
    "certifications": ["plain strings only"],
    "additional_sections": [{{"heading": "", "content": ["plain strings only"]}}]
  }}
- included_keywords: array of exact confirmed ATS keywords included.
- not_included_keywords: array of confirmed ATS keywords not included with short reasons as plain strings.
- unconfirmed_keywords: array of missing ATS keywords not confirmed by the user.
- change_summary: array of short plain strings explaining major changes.
- safety_notes: array of short plain strings reminding the user to review truthfulness.
- Divide skills into hard_skills and soft_skills.
- hard_skills should include tools, systems, technical abilities, industry skills, software, platforms, languages, and role-specific service skills.
- soft_skills should include communication, teamwork, adaptability, time management, problem solving, attention to detail, leadership, and interpersonal strengths.
- Do not duplicate the same skill in both hard_skills and soft_skills.

Target job title:
{job_title}

Job description:
{truncate(job_description, MAX_JOB_DESCRIPTION_CHARS)}

Rule-based ATS missing keyword feedback:
{feedback_json}

USER-CONFIRMED KEYWORDS:
{confirmed_json}

Rough resume section map extracted by CareerLens:
{section_map_json}

Original resume text:
{truncate(resume_text, MAX_RESUME_CHARS)}
""".strip()


def local_tailor_unavailable_result(message: str, resume_text: str = '') -> dict[str, Any]:
    return merge_tailor_defaults(
        {
            'tailored_resume_text': resume_text,
            'structured_resume': {},
            'change_summary': [],
            'safety_notes': [
                'AI tailoring is unavailable. The original extracted resume text is shown instead.',
                'Review all resume changes manually before applying.',
            ],
            'message': message,
        },
        status='unavailable',
    )


def generate_tailored_resume(
    resume_text: str,
    job_title: str,
    job_description: str,
    ats_result: dict[str, Any],
    selected_template: str = 'classic_ats',
    confirmed_keywords: dict[str, list[str]] | None = None,
) -> dict[str, Any]:
    if not settings.GEMINI_API_KEY:
        result = local_tailor_unavailable_result('GEMINI_API_KEY is not configured on the backend.', resume_text)
        result['template'] = selected_template
        return result
    if genai is None or types is None:
        result = local_tailor_unavailable_result('google-genai is not installed in the backend environment.', resume_text)
        result['template'] = selected_template
        return result

    try:
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=build_tailor_prompt(resume_text, job_title, job_description, ats_result, selected_template, confirmed_keywords),
            config=types.GenerateContentConfig(
                temperature=0.15,
                response_mime_type='application/json',
            ),
        )
        text = getattr(response, 'text', '') or ''
        payload = json.loads(strip_json_code_fence(text))
        if not isinstance(payload, dict):
            raise ValueError('Gemini returned JSON that is not an object.')
        result = merge_tailor_defaults(payload, status='success')
        result['template'] = selected_template
        result = ensure_confirmed_skill_keywords(result, confirmed_keywords)
        if not result.get('tailored_resume_text'):
            result['tailored_resume_text'] = render_tailored_resume_text(result.get('structured_resume') or {}, resume_text)
            result['safety_notes'].append('Gemini did not return tailored text, so CareerLens rendered the structured resume or original text.')
        return result
    except Exception as exc:
        return merge_tailor_defaults(
            {
                'template': selected_template,
                'tailored_resume_text': resume_text,
                'structured_resume': {},
                'change_summary': [],
                'safety_notes': [
                    'AI tailoring could not be generated. The original extracted resume text is shown instead.',
                    'Check the backend logs, GEMINI_API_KEY, model name, and network/API quota settings.',
                ],
                'message': f'Gemini tailoring request failed: {exc}',
            },
            status='error',
        )


def local_dashboard_guidance(metrics: dict[str, Any]) -> dict[str, Any]:
    latest = metrics.get('latest_report') or {}
    missing = metrics.get('top_missing_keywords') or []
    primary_keywords = [item.get('keyword') for item in missing[:5] if item.get('keyword')]
    recommendations = []
    if latest.get('job_match_score', 0) < 60:
        recommendations.append('Focus on the top ATS gaps before applying: exact role title, high-priority hard skills, and required experience wording.')
    if primary_keywords:
        recommendations.append('Create a short learning or proof plan for these keywords: ' + ', '.join(primary_keywords) + '.')
    if latest.get('ats_readability_score', 100) < 75:
        recommendations.append('Use a cleaner one-column resume layout with standard headings and contact details at the top.')
    recommendations.append('After tailoring, run the ATS check again and compare the score trend before submitting applications.')
    return {
        'status': 'fallback',
        'headline': 'CareerLens generated rule-based guidance because AI guidance is unavailable or disabled.',
        'recommendations': recommendations,
        'next_steps': ['Tailor your resume using confirmed truthful keywords.', 'Add measurable achievements where possible.', 'Apply to roles that match your strongest exact keywords.'],
    }


def generate_dashboard_guidance(metrics: dict[str, Any], use_ai: bool = False) -> dict[str, Any]:
    if not use_ai or not settings.GEMINI_API_KEY or genai is None or types is None:
        return local_dashboard_guidance(metrics)
    try:
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        prompt = f"""
You are CareerLens Career Guidance AI. Based on the user's dashboard metrics, provide practical career guidance.
Do not invent personal facts. Do not mention private data. Return only JSON with keys: status, headline, recommendations, next_steps.
recommendations and next_steps must be arrays of concise plain strings.

Dashboard metrics:
{json.dumps(metrics, ensure_ascii=False)[:10000]}
""".strip()
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.25, response_mime_type='application/json'),
        )
        payload = json.loads(strip_json_code_fence(getattr(response, 'text', '') or ''))
        if not isinstance(payload, dict):
            raise ValueError('Gemini returned invalid dashboard guidance JSON.')
        return {
            'status': 'success',
            'headline': _clean_string(payload.get('headline')),
            'recommendations': normalize_ai_list(payload.get('recommendations')),
            'next_steps': normalize_ai_list(payload.get('next_steps')),
        }
    except Exception as exc:
        result = local_dashboard_guidance(metrics)
        result['message'] = f'Gemini dashboard guidance failed: {exc}'
        return result

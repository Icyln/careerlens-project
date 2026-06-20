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


DEFAULT_CAREER_GUIDANCE: dict[str, Any] = {
    'engine': 'gemini_career_guidance',
    'status': 'unavailable',
    'headline': '',
    'career_positioning': '',
    'target_direction': '',
    'readiness_summary': '',
    'priority_actions': [],
    'application_strategy': [],
    'skill_plan': [],
    'resume_focus': [],
    'risk_warnings': [],
    'next_7_days': [],
    'next_30_days': [],
    'message': '',
}


def _clean_string(value: Any) -> str:
    if value is None:
        return ''

    if isinstance(value, str):
        return re.sub(r'\s+', ' ', value).strip()

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
                item.get('title')
                or item.get('summary')
                or item.get('text')
                or item.get('action')
                or item.get('next_step')
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


def _normalize_action(value: Any, index: int) -> dict[str, str]:
    if not isinstance(value, dict):
        value = {'title': value}

    return {
        'id': _clean_string(value.get('id')) or f'action-{index + 1}',
        'title': _clean_string(value.get('title')) or 'Improve career readiness',
        'reason': _clean_string(value.get('reason')) or 'This will make your next application stronger.',
        'next_step': _clean_string(value.get('next_step')) or 'Choose one specific action and complete it this week.',
        'timeframe': _clean_string(value.get('timeframe')) or 'This week',
    }


def _strip_json_code_fence(text: str) -> str:
    text = (text or '').strip()

    if text.startswith('```'):
        text = re.sub(r'^```(?:json)?', '', text, flags=re.IGNORECASE).strip()
        text = re.sub(r'```$', '', text).strip()

    start = text.find('{')
    end = text.rfind('}')

    if start >= 0 and end >= start:
        return text[start:end + 1]

    return text


def _load_json_object(text: str) -> dict[str, Any]:
    payload = json.loads(_strip_json_code_fence(text))

    if not isinstance(payload, dict):
        raise ValueError('Gemini returned JSON that is not an object.')

    return payload


def _compact_metrics(metrics: dict[str, Any]) -> dict[str, Any]:
    latest = metrics.get('latest_report') or {}
    application_metrics = metrics.get('application_metrics') or {}

    return {
        'total_resumes': metrics.get('total_resumes'),
        'total_reports': metrics.get('total_reports'),
        'average_job_match_score': metrics.get('average_job_match_score'),
        'average_ats_readability_score': metrics.get('average_ats_readability_score'),
        'best_job_match_score': metrics.get('best_job_match_score'),
        'latest_report': {
            'job_title': latest.get('job_title'),
            'resume_name': latest.get('resume_name'),
            'job_match_score': latest.get('job_match_score'),
            'match_level': latest.get('match_level'),
            'ats_readability_score': latest.get('ats_readability_score'),
            'ats_readability_level': latest.get('ats_readability_level'),
            'top_fixes': latest.get('top_fixes') or [],
            'readiness_radar': latest.get('readiness_radar') or [],
        },
        'top_missing_keywords': metrics.get('top_missing_keywords') or [],
        'score_trend': metrics.get('score_trend') or [],
        'application_metrics': {
            'total_applications': application_metrics.get('total_applications'),
            'active_applications': application_metrics.get('active_applications'),
            'interview_count': application_metrics.get('interview_count'),
            'offer_count': application_metrics.get('offer_count'),
            'followups_due': application_metrics.get('followups_due'),
            'response_rate': application_metrics.get('response_rate'),
            'interview_rate': application_metrics.get('interview_rate'),
            'status_distribution': application_metrics.get('status_distribution') or [],
        },
    }


def _fallback_guidance(user_context: dict[str, Any], metrics: dict[str, Any], message: str = '') -> dict[str, Any]:
    target_jobs = _clean_string(user_context.get('target_jobs')) or 'target roles'
    target_companies = _clean_string(user_context.get('target_companies')) or 'your preferred companies'
    pain_points = _clean_string(user_context.get('pain_points')) or 'your current job search challenges'

    latest = metrics.get('latest_report') or {}
    latest_score = latest.get('job_match_score') or metrics.get('average_job_match_score') or 0
    top_keywords = [
        item.get('keyword')
        for item in metrics.get('top_missing_keywords') or []
        if isinstance(item, dict) and item.get('keyword')
    ][:5]

    result = json.loads(json.dumps(DEFAULT_CAREER_GUIDANCE))

    result.update({
        'status': 'fallback',
        'headline': 'CareerLens created a practical guidance brief from your dashboard signals.',
        'career_positioning': (
            f'Position yourself around the roles you want most: {target_jobs}. '
            f'Use your resume evidence, ATS history, and current strengths to show a clear fit.'
        ),
        'target_direction': (
            f'Prioritize roles at {target_companies} where your current resume match is strongest, '
            'then improve gaps before applying to more competitive roles.'
        ),
        'readiness_summary': (
            f'Your latest readiness signal is around {latest_score}%. '
            'Use this as a guide, not a final judgment. The strongest next move is to improve repeated gaps before sending applications.'
        ),
        'priority_actions': [
            {
                'id': 'action-1',
                'title': 'Build a focused target list',
                'reason': f'Your job search will be easier if {target_jobs} and {target_companies} are clearly prioritized.',
                'next_step': 'Create a short list of 5 to 10 roles or companies and rank them by fit.',
                'timeframe': 'Today',
            },
            {
                'id': 'action-2',
                'title': 'Fix the strongest ATS gaps first',
                'reason': 'Repeated missing keywords and weak match areas can reduce your interview chances.',
                'next_step': (
                    f'Review these possible gap areas: {", ".join(top_keywords)}.'
                    if top_keywords
                    else 'Review your latest report and choose the top three resume gaps to improve.'
                ),
                'timeframe': 'This week',
            },
            {
                'id': 'action-3',
                'title': 'Turn pain points into a plan',
                'reason': f'Your current struggle is: {pain_points}. A small action plan makes it easier to move forward.',
                'next_step': 'Write one action you can complete in the next 24 hours to reduce this struggle.',
                'timeframe': 'Next 24 hours',
            },
        ],
        'application_strategy': [
            'Apply first to roles where your resume already has strong evidence.',
            'Tailor the resume before applying to priority companies.',
            'Track every application and follow up when a next follow-up date is due.',
        ],
        'skill_plan': [
            'Choose one missing skill or keyword and build proof through a small project, course, or work example.',
            'Prepare interview stories for teamwork, pressure, learning quickly, and role-specific strengths.',
        ],
        'resume_focus': [
            'Strengthen the exact target role title and top hard skills.',
            'Add measurable achievements where truthful.',
            'Keep the resume ATS-readable and avoid unsupported claims.',
        ],
        'risk_warnings': [
            'Do not apply widely without tailoring when the role is competitive.',
            'Do not add skills, tools, or experience unless they are truthful.',
        ],
        'next_7_days': [
            'Choose 5 priority roles.',
            'Tailor one resume version for the strongest role.',
            'Prepare two interview stories linked to your resume.',
        ],
        'next_30_days': [
            'Track applications and response rate.',
            'Improve repeated skill gaps.',
            'Review which job titles produce the strongest ATS scores.',
        ],
        'message': message or 'Gemini guidance was unavailable, so CareerLens created a safe rule-based guidance brief.',
    })

    return result


def _merge_guidance(payload: dict[str, Any], status: str = 'success') -> dict[str, Any]:
    result = json.loads(json.dumps(DEFAULT_CAREER_GUIDANCE))
    result.update(payload or {})

    result['engine'] = 'gemini_career_guidance'
    result['status'] = status
    result['headline'] = _clean_string(result.get('headline')) or 'CareerLens generated a personalized career guidance brief.'
    result['career_positioning'] = _clean_multiline(result.get('career_positioning'))
    result['target_direction'] = _clean_multiline(result.get('target_direction'))
    result['readiness_summary'] = _clean_multiline(result.get('readiness_summary'))
    result['priority_actions'] = [
        _normalize_action(item, index)
        for index, item in enumerate(result.get('priority_actions') or [])
    ]
    result['application_strategy'] = _listify(result.get('application_strategy'))
    result['skill_plan'] = _listify(result.get('skill_plan'))
    result['resume_focus'] = _listify(result.get('resume_focus'))
    result['risk_warnings'] = _listify(result.get('risk_warnings'))
    result['next_7_days'] = _listify(result.get('next_7_days'))
    result['next_30_days'] = _listify(result.get('next_30_days'))
    result['message'] = _clean_string(result.get('message'))

    return result


def _build_prompt(user_context: dict[str, Any], metrics: dict[str, Any]) -> str:
    return f"""
You are CareerLens Career Intelligence Coach.

Create a concise, realistic career plan using:
1. User career context
2. CareerLens dashboard metrics

Important rules:
- Be practical, direct, and realistic.
- Do not write long paragraphs.
- Do not promise job offers.
- Do not invent user experience, companies, skills, achievements, degrees, or certifications.
- If the user has weaknesses or gaps, explain how to handle them honestly.
- Make every recommendation useful for real job searching.
- Return only valid JSON.
- Do not use markdown.

Length rules:
- headline: maximum 14 words.
- career_positioning: maximum 2 short sentences.
- target_direction: maximum 2 short sentences.
- readiness_summary: maximum 2 short sentences.
- priority_actions: exactly 3 items.
- Each priority action title: maximum 8 words.
- Each priority action reason: maximum 18 words.
- Each priority action next_step: maximum 18 words.
- application_strategy: exactly 4 short items.
- skill_plan: exactly 4 short items.
- resume_focus: exactly 4 short items.
- risk_warnings: exactly 3 short items.
- next_7_days: exactly 4 checklist-style items.
- next_30_days: exactly 4 roadmap-style items.

JSON shape:
{{
  "headline": "",
  "career_positioning": "",
  "target_direction": "",
  "readiness_summary": "",
  "priority_actions": [
    {{
      "id": "action-1",
      "title": "",
      "reason": "",
      "next_step": "",
      "timeframe": ""
    }}
  ],
  "application_strategy": ["short strings"],
  "skill_plan": ["short strings"],
  "resume_focus": ["short strings"],
  "risk_warnings": ["short strings"],
  "next_7_days": ["short strings"],
  "next_30_days": ["short strings"]
}}

User career context:
{json.dumps(user_context, ensure_ascii=False, indent=2)}

CareerLens dashboard metrics:
{json.dumps(_compact_metrics(metrics), ensure_ascii=False, indent=2)}
""".strip()

def generate_personalized_career_guidance(
    *,
    user_context: dict[str, Any],
    dashboard_metrics: dict[str, Any],
) -> dict[str, Any]:
    user_context = user_context or {}
    dashboard_metrics = dashboard_metrics or {}

    if genai is None or types is None:
        return _fallback_guidance(
            user_context,
            dashboard_metrics,
            message='google-genai is not installed, so CareerLens created a safe guidance brief.',
        )

    api_key = getattr(settings, 'GEMINI_API_KEY', '')

    if not api_key:
        return _fallback_guidance(
            user_context,
            dashboard_metrics,
            message='Gemini API key is missing, so CareerLens created a safe guidance brief.',
        )

    model = getattr(settings, 'GEMINI_MODEL', 'gemini-2.5-flash-lite')

    try:
        client = genai.Client(api_key=api_key)

        response = client.models.generate_content(
            model=model,
            contents=_build_prompt(user_context, dashboard_metrics),
            config=types.GenerateContentConfig(
                temperature=0.35,
                response_mime_type='application/json',
                max_output_tokens=2200,
            ),
        )

        payload = _load_json_object(getattr(response, 'text', '') or '{}')

        return _merge_guidance(payload, status='success')

    except Exception as exc:
        print('CAREER GUIDANCE GEMINI ERROR:', repr(exc))

        return _fallback_guidance(
            user_context,
            dashboard_metrics,
            message='Gemini could not generate guidance, so CareerLens created a safe guidance brief.',
        )
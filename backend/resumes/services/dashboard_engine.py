from __future__ import annotations

from collections import Counter
from typing import Any
from django.utils import timezone


def _score(report: Any, key: str, default: int = 0) -> int:
    ats = report.ats_result or {}
    value = ats.get(key)
    if value is None and key == 'job_match_score':
        value = ats.get('overall_score')
    try:
        return int(round(float(value)))
    except Exception:
        return default


def _level(score: int) -> str:
    if score >= 85:
        return 'Excellent'
    if score >= 75:
        return 'High'
    if score >= 60:
        return 'Moderate'
    if score >= 45:
        return 'Fair'
    return 'Low'


def _missing_keywords(report: Any) -> list[str]:
    summary = (report.ats_result or {}).get('summary') or {}
    hard = (summary.get('hard_skills') or {}).get('missing') or []
    soft = (summary.get('soft_skills') or {}).get('missing') or []
    title = (summary.get('job_title_match') or {}).get('missing') or []
    education = (summary.get('education_match') or {}).get('missing') or []
    experience = (summary.get('experience_year_match') or {}).get('missing') or []
    result: list[str] = []
    for item in list(hard) + list(soft) + list(title) + list(education) + list(experience):
        text = str(item).strip()
        if text and text.lower() not in {value.lower() for value in result}:
            result.append(text)
    return result

def _as_list(value: Any) -> list[Any]:
    if isinstance(value, list):
        return value
    if isinstance(value, tuple):
        return list(value)
    return []


def _to_score(value: Any, default: int = 0) -> int:
    try:
        return max(0, min(100, int(round(float(value)))))
    except Exception:
        return default


def _section_score(section: Any, default: int = 0) -> int:
    """
    Converts one ATS summary section into a 0-100 score.

    Supports different possible structures:
    - {"score": 75}
    - {"percentage": 75}
    - {"matched": [...], "missing": [...]}
    - {"present": [...], "missing": [...]}
    - {"is_match": true}
    """

    if not isinstance(section, dict):
        return default

    for key in [
        'score',
        'percentage',
        'match_score',
        'coverage',
        'coverage_score',
        'ats_score',
    ]:
        if key in section:
            return _to_score(section.get(key), default)

    matched = (
        _as_list(section.get('matched'))
        or _as_list(section.get('present'))
        or _as_list(section.get('found'))
        or _as_list(section.get('included'))
    )
    missing = _as_list(section.get('missing'))

    if matched or missing:
        total = len(matched) + len(missing)
        if total:
            return _to_score((len(matched) / total) * 100, default)

    status = str(section.get('status') or '').lower()
    if status in {'matched', 'match', 'full', 'complete', 'yes', 'pass'}:
        return 100
    if status in {'partial', 'partially matched', 'medium'}:
        return 60
    if status in {'missing', 'no match', 'fail'}:
        return 0

    if section.get('is_match') is True:
        return 100
    if section.get('is_match') is False:
        return 0

    return default

def _section_applies(section: Any, default: bool = True) -> bool:
    """Return whether a radar/checklist section was actually applied.

    Some ATS sections, such as education and experience, are scored 100 when
    the job description has no requirement. That is correct for the ATS engine,
    but the dashboard radar should not show neutral 100% sections as real wins.
    """

    if not isinstance(section, dict):
        return default

    if 'applied' in section:
        return bool(section.get('applied'))

    return default

def _keyword_coverage_score(summary: dict[str, Any]) -> int:
    """Calculate matched-vs-missing coverage only for applied ATS sections."""

    sections = [
        (summary.get('job_title_match') or {}, True),
        (summary.get('hard_skills') or {}, True),
        (summary.get('soft_skills') or {}, True),
        (summary.get('education_match') or {}, False),
        (summary.get('experience_year_match') or summary.get('experience_match') or {}, False),
    ]

    matched_count = 0
    missing_count = 0

    for section, applies_by_default in sections:
        if not isinstance(section, dict):
            continue

        if not _section_applies(section, default=applies_by_default):
            continue

        matched = (
            _as_list(section.get('matched'))
            or _as_list(section.get('present'))
            or _as_list(section.get('found'))
            or _as_list(section.get('included'))
        )
        missing = _as_list(section.get('missing'))

        matched_count += len(matched)
        missing_count += len(missing)

    total = matched_count + missing_count

    if not total:
        return 0

    return _to_score((matched_count / total) * 100)


def _latest_readiness_radar(report: Any) -> list[dict[str, Any]]:
    if not report:
        return []

    ats = report.ats_result or {}
    summary = ats.get('summary') or {}

    job_title_section = summary.get('job_title_match') or {}
    hard_skills_section = summary.get('hard_skills') or {}
    soft_skills_section = summary.get('soft_skills') or {}
    education_section = summary.get('education_match') or {}
    experience_section = (
        summary.get('experience_year_match')
        or summary.get('experience_match')
        or {}
    )

    job_match_score = _score(report, 'job_match_score')
    readability_score = _score(report, 'ats_readability_score')

    hard_score = _section_score(hard_skills_section, default=job_match_score)
    soft_score = _section_score(soft_skills_section, default=job_match_score)
    title_score = _section_score(job_title_section, default=job_match_score)
    keyword_coverage = _keyword_coverage_score(summary)

    radar = [
        {
            'axis': 'Job title match',
            'score': title_score,
            'description': 'How closely the resume target title matches the job role.',
        },
        {
            'axis': 'Hard skills',
            'score': hard_score,
            'description': 'Coverage of required technical or role-specific skills.',
        },
        {
            'axis': 'Soft skills',
            'score': soft_score,
            'description': 'Coverage of communication, teamwork, leadership, and similar skills.',
        },
    ]

    if _section_applies(experience_section, default=False):
        radar.append({
            'axis': 'Experience match',
            'score': _section_score(experience_section, default=job_match_score),
            'description': 'How well the resume matches the required experience wording.',
        })

    if _section_applies(education_section, default=False):
        radar.append({
            'axis': 'Education match',
            'score': _section_score(education_section, default=job_match_score),
            'description': 'How well education requirements are reflected.',
        })

    radar.extend([
        {
            'axis': 'Readability',
            'score': readability_score,
            'description': 'How clean and ATS-readable the resume format is.',
        },
        {
            'axis': 'Requirement coverage',
            'score': keyword_coverage,
            'description': 'Matched versus missing applied ATS requirements.',
        },
    ])

    return radar

def _clean_dashboard_text(value: Any) -> str:
    return str(value or '').strip()


def _latest_missing_keywords(report: Any, limit: int = 8) -> list[str]:
    if not report:
        return []

    output: list[str] = []
    seen: set[str] = set()

    for item in _missing_keywords(report):
        clean = _clean_dashboard_text(item)
        key = clean.lower()

        if clean and key not in seen:
            output.append(clean)
            seen.add(key)

        if len(output) >= limit:
            break

    return output


def _latest_top_fixes(report: Any, limit: int = 5) -> list[str]:
    if not report:
        return []

    summary = (report.ats_result or {}).get('summary') or {}
    fixes = summary.get('top_fixes') or []

    output: list[str] = []
    seen: set[str] = set()

    for item in fixes:
        clean = _clean_dashboard_text(item)
        key = clean.lower()

        if clean and key not in seen:
            output.append(clean)
            seen.add(key)

        if len(output) >= limit:
            break

    return output


def _weakest_latest_readiness_items(report: Any, limit: int = 2) -> list[dict[str, Any]]:
    radar = _latest_readiness_radar(report)

    clean = [
        {
            'axis': _clean_dashboard_text(item.get('axis')),
            'score': _to_score(item.get('score')),
            'description': _clean_dashboard_text(item.get('description')),
        }
        for item in radar
        if isinstance(item, dict) and _clean_dashboard_text(item.get('axis'))
    ]

    return sorted(clean, key=lambda item: item['score'])[:limit]


def _keyword_phrase(items: list[str], fallback: str = 'your latest ATS gaps') -> str:
    clean = [_clean_dashboard_text(item) for item in items if _clean_dashboard_text(item)]

    if not clean:
        return fallback

    return ', '.join(clean[:3])


def _build_latest_report_action_plan(latest: Any) -> dict[str, Any]:
    if not latest:
        return {
            'engine': 'rule_based_career_action_plan',
            'status': 'empty',
            'headline': 'Run an ATS analysis to unlock your Career Action Plan.',
            'career_positioning': 'CareerLens will create a rule-based plan after your first ATS report.',
            'target_direction': 'Upload a resume, paste a job description, and run ATS analysis first.',
            'readiness_summary': 'No latest ATS report is available yet.',
            'priority_actions': [],
            'application_strategy': [],
            'skill_plan': [],
            'resume_focus': [],
            'risk_warnings': [],
            'next_7_days': [
                'Upload or select a resume.',
                'Paste a complete job description.',
                'Run ATS analysis.',
                'Return to the dashboard to view your Career Action Plan.',
            ],
            'next_30_days': [],
            'message': 'No latest ATS report found.',
        }

    job_title = _clean_dashboard_text(getattr(latest, 'job_title', '')) or 'target role'
    resume_name = _clean_dashboard_text(getattr(getattr(latest, 'resume', None), 'original_name', '')) or 'latest resume'

    job_match_score = _score(latest, 'job_match_score')
    readability_score = _score(latest, 'ats_readability_score')

    match_level = (
        (latest.ats_result or {}).get('job_match_level')
        or (latest.ats_result or {}).get('match_level')
        or _level(job_match_score)
    )

    readability_level = (
        (latest.ats_result or {}).get('ats_readability_level')
        or _level(readability_score)
    )

    missing_keywords = _latest_missing_keywords(latest)
    top_fixes = _latest_top_fixes(latest)
    weakest_items = _weakest_latest_readiness_items(latest)

    missing_phrase = _keyword_phrase(missing_keywords)
    top_fix = top_fixes[0] if top_fixes else ''
    weakest = weakest_items[0] if weakest_items else {}
    weakest_axis = weakest.get('axis') or 'Requirement coverage'
    weakest_score = weakest.get('score', 0)

    if job_match_score >= 85 and readability_score >= 85:
        headline = f'{job_title}: strong latest ATS readiness'
        readiness_summary = (
            f'Your latest report is strong: {job_match_score}% job match and '
            f'{readability_score}% readability.'
        )
    elif job_match_score >= 60:
        headline = f'{job_title}: improve final ATS gaps'
        readiness_summary = (
            f'Your latest report is {match_level} at {job_match_score}% job match. '
            f'Readability is {readability_level} at {readability_score}%.'
        )
    else:
        headline = f'{job_title}: priority resume repair needed'
        readiness_summary = (
            f'Your latest report is {match_level} at {job_match_score}% job match. '
            f'Focus on the biggest missing requirements before applying.'
        )

    if missing_keywords:
        first_action_next_step = f'Add truthful evidence for: {missing_phrase}.'
    elif top_fix:
        first_action_next_step = top_fix
    else:
        first_action_next_step = 'Strengthen the most relevant achievements for this job.'

    if readability_score < 75:
        readability_action = {
            'id': 'action-2',
            'title': 'Improve ATS readability',
            'reason': f'Readability is {readability_score}%, so formatting may reduce parsing quality.',
            'next_step': 'Use clear headings, simple bullets, and one-column ATS-friendly layout.',
            'timeframe': 'This week',
        }
    else:
        readability_action = {
            'id': 'action-2',
            'title': 'Strengthen weakest section',
            'reason': f'{weakest_axis} is the weakest latest readiness area at {weakest_score}%.',
            'next_step': f'Review the {weakest_axis.lower()} section and add truthful job-specific evidence.',
            'timeframe': 'This week',
        }

    return {
        'engine': 'rule_based_career_action_plan',
        'status': 'success',
        'source': 'latest_ats_report_only',
        'latest_report_id': str(latest.id),
        'headline': headline,
        'career_positioning': (
            f'Position your resume for {job_title} using only evidence from {resume_name}. '
            'This plan is based only on your latest ATS report.'
        ),
        'target_direction': (
            f'Prioritize improving the latest {job_title} report before creating more applications. '
            'Use the missing requirements as your short-term improvement checklist.'
        ),
        'readiness_summary': readiness_summary,
        'priority_actions': [
            {
                'id': 'action-1',
                'title': 'Fix latest ATS gaps',
                'reason': (
                    f'The latest report is missing: {missing_phrase}.'
                    if missing_keywords
                    else 'The latest report has no major keyword gaps, so focus on stronger proof.'
                ),
                'next_step': first_action_next_step,
                'timeframe': 'Today',
            },
            readability_action,
            {
                'id': 'action-3',
                'title': 'Recheck after edits',
                'reason': 'The action plan should be validated against the same target role.',
                'next_step': 'Update the resume, rerun ATS analysis, and compare the new latest score.',
                'timeframe': 'After editing',
            },
        ],
        'application_strategy': [
            f'Use this resume mainly for {job_title} roles until the latest match improves.',
            'Apply only after the top latest ATS gaps are reviewed.',
            'Do not use missing keywords unless they are truthful and supported.',
            'Create a new ATS report when targeting a different job title.',
        ],
        'skill_plan': [
            (
                f'Build proof for {missing_keywords[0]}.'
                if missing_keywords
                else 'Build one stronger proof point for the target role.'
            ),
            (
                f'Review {missing_keywords[1]}.'
                if len(missing_keywords) > 1
                else 'Prepare one short project, course, or work example.'
            ),
            'Prepare interview examples for the strongest resume claims.',
            'Avoid adding unsupported skills just to increase the score.',
        ],
        'resume_focus': [
            f'Match the resume headline or summary to {job_title}.',
            (
                f'Add truthful evidence for {missing_phrase}.'
                if missing_keywords
                else 'Make achievements more specific and measurable.'
            ),
            'Keep bullet points clear, specific, and easy to scan.',
            'Keep formatting ATS-friendly with standard section headings.',
        ],
        'risk_warnings': [
            'Do not add fake tools, certificates, experience, or achievements.',
            'Do not apply with the same resume to unrelated roles without checking ATS fit.',
            'Do not ignore readability even when keyword coverage improves.',
        ],
        'next_7_days': [
            'Review the latest ATS report top fixes.',
            (
                f'Update resume wording for {missing_phrase}.'
                if missing_keywords
                else 'Improve two resume bullets with clearer evidence.'
            ),
            'Clean formatting and check section headings.',
            'Rerun ATS analysis and compare the new latest report.',
        ],
        'next_30_days': [
            'Create one improved resume version for your strongest target role.',
            'Track whether the latest ATS score improves after each edit.',
            'Build proof for one repeated missing skill or requirement.',
            'Use the best-scoring resume version for priority applications.',
        ],
        'latest_report_snapshot': {
            'job_title': job_title,
            'resume_name': resume_name,
            'job_match_score': job_match_score,
            'match_level': match_level,
            'ats_readability_score': readability_score,
            'ats_readability_level': readability_level,
            'missing_keywords': missing_keywords,
            'top_fixes': top_fixes,
            'weakest_readiness_areas': weakest_items,
        },
        'message': 'Career Action Plan generated instantly from the latest ATS report only. No AI API was used.',
    }

def build_dashboard_payload(resumes: list[Any], reports: list[Any], applications: list[Any] | None = None) -> dict[str, Any]:
    reports = sorted(reports, key=lambda item: item.created_at, reverse=True)
    latest = reports[0] if reports else None
    scores = [_score(report, 'job_match_score') for report in reports]
    readability_scores = [_score(report, 'ats_readability_score') for report in reports]
    missing_counter: Counter[str] = Counter()
    for report in reports:
        missing_counter.update(_missing_keywords(report))

    recent = list(reversed(reports[:8]))
    score_trend = [
        {
            'label': report.created_at.strftime('%b %d'),
            'job_title': report.job_title,
            'job_match_score': _score(report, 'job_match_score'),
            'ats_readability_score': _score(report, 'ats_readability_score'),
        }
        for report in recent
    ]

    distribution = Counter(_level(score) for score in scores)
    latest_summary = (latest.ats_result or {}).get('summary') if latest else {}
    latest_report = {
        'id': str(latest.id),
        'job_title': latest.job_title,
        'resume_name': latest.resume.original_name,
        'created_at': latest.created_at.isoformat(),
        'job_match_score': _score(latest, 'job_match_score'),
        'match_level': (latest.ats_result or {}).get('job_match_level') or (latest.ats_result or {}).get('match_level') or _level(_score(latest, 'job_match_score')),
        'ats_readability_score': _score(latest, 'ats_readability_score'),
        'ats_readability_level': (latest.ats_result or {}).get('ats_readability_level') or _level(_score(latest, 'ats_readability_score')),
        'top_fixes': (latest_summary or {}).get('top_fixes') or [],
        'readiness_radar': _latest_readiness_radar(latest),
    } if latest else {}

    applications = applications or []
    today = timezone.localdate()

    application_status_order = ['saved', 'applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn']
    application_status_labels = {
        'saved': 'Saved',
        'applied': 'Applied',
        'screening': 'Screening',
        'interview': 'Interview',
        'offer': 'Offer',
        'rejected': 'Rejected',
        'withdrawn': 'Withdrawn',
    }

    application_distribution = Counter(getattr(item, 'status', '') for item in applications)

    active_application_statuses = {'saved', 'applied', 'screening', 'interview'}
    applied_or_later = [
        item for item in applications
        if getattr(item, 'status', '') != 'saved'
    ]
    responses = [
        item for item in applications
        if getattr(item, 'status', '') in {'screening', 'interview', 'offer', 'rejected'}
    ]

    followups_due = [
        item for item in applications
        if getattr(item, 'next_follow_up_date', None)
        and item.next_follow_up_date <= today
        and getattr(item, 'status', '') in active_application_statuses
    ]

    application_metrics = {
        'total_applications': len(applications),
        'active_applications': len([
            item for item in applications
            if getattr(item, 'status', '') in active_application_statuses
        ]),
        'interview_count': application_distribution.get('interview', 0),
        'offer_count': application_distribution.get('offer', 0),
        'rejected_count': application_distribution.get('rejected', 0),
        'followups_due': len(followups_due),
        'response_rate': round((len(responses) / len(applied_or_later)) * 100, 1) if applied_or_later else 0,
        'interview_rate': round((application_distribution.get('interview', 0) / len(applied_or_later)) * 100, 1) if applied_or_later else 0,
        'status_distribution': [
            {
                'status': status,
                'label': application_status_labels.get(status, status.title()),
                'count': application_distribution.get(status, 0),
            }
            for status in application_status_order
        ],
        'recent_applications': [
            {
                'id': str(item.id),
                'job_title': item.job_title,
                'company_name': item.company_name,
                'status': item.status,
                'priority': item.priority,
                'date_applied': item.date_applied.isoformat() if item.date_applied else '',
                'next_follow_up_date': item.next_follow_up_date.isoformat() if item.next_follow_up_date else '',
                'updated_at': item.updated_at.isoformat() if item.updated_at else '',
            }
            for item in applications[:8]
        ],
    }

    metrics = {
        'total_resumes': len(resumes),
        'total_reports': len(reports),
        'average_job_match_score': round(sum(scores) / len(scores), 1) if scores else 0,
        'average_ats_readability_score': round(sum(readability_scores) / len(readability_scores), 1) if readability_scores else 0,
        'best_job_match_score': max(scores) if scores else 0,
        'latest_report': latest_report,
        'career_action_plan': _build_latest_report_action_plan(latest),
        'score_trend': score_trend,
        'score_distribution': [{'level': level, 'count': distribution.get(level, 0)} for level in ['Excellent', 'High', 'Moderate', 'Fair', 'Low']],
        'top_missing_keywords': [{'keyword': keyword, 'count': count} for keyword, count in missing_counter.most_common(12)],
        'resume_activity': [
            {
                'id': str(resume.id),
                'name': resume.original_name,
                'uploaded_at': resume.uploaded_at.isoformat(),
                'reports_count': getattr(resume, 'reports_count', 0),
            }
            for resume in resumes[:8]
        ],
        'application_metrics': application_metrics,
    }
    return metrics

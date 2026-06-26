from __future__ import annotations

import html
import json
import re
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from typing import Any

from django.conf import settings
from django.core.cache import cache

JSEARCH_TIMEOUT_SECONDS = 6
JSEARCH_CACHE_SECONDS = 60 * 10
MAX_FAST_SEARCH_TERMS = 5

COUNTRY_NAMES = {
    '': 'Any country',
    'gb': 'United Kingdom',
    'us': 'United States',
    'ca': 'Canada',
    'au': 'Australia',
    'nz': 'New Zealand',
    'in': 'India',
    'sg': 'Singapore',
    'ae': 'United Arab Emirates',
    'jp': 'Japan',
    'kr': 'South Korea',
    'th': 'Thailand',
    'my': 'Malaysia',
    'mm': 'Myanmar',
    'ph': 'Philippines',
    'de': 'Germany',
    'fr': 'France',
    'it': 'Italy',
}

JOB_TITLE_SYNONYMS = {
    'waiter': [
        'waiter',
        'waitress',
        'server',
        'restaurant server',
        'food and beverage server',
        'food beverage server',
        'f&b service',
        'f&b service crew',
        'service crew',
        'restaurant crew',
        'cafe crew',
        'banquet server',
        'bar waiter',
        'hotel server',
        'hotel waiter',
        'dining assistant',
        'restaurant attendant',
    ],
    'waitress': [
        'waitress',
        'waiter',
        'server',
        'restaurant server',
        'food and beverage server',
        'f&b service crew',
        'service crew',
        'restaurant crew',
        'cafe crew',
        'banquet server',
    ],
    'server': [
        'server',
        'restaurant server',
        'food and beverage server',
        'waiter',
        'waitress',
        'service crew',
        'restaurant crew',
        'banquet server',
        'hotel server',
    ],

    'frontend': [
        'frontend developer',
        'front end developer',
        'frontend engineer',
        'react developer',
        'vue developer',
        'javascript developer',
        'typescript developer',
        'ui developer',
        'web developer',
        'junior frontend developer',
        'frontend web developer',
        'html css developer',
    ],

    'developer': [
        'software developer',
        'software engineer',
        'junior software developer',
        'backend developer',
        'full stack developer',
        'web developer',
        'python developer',
        'java developer',
        'php developer',
        'node.js developer',
        'application developer',
        'systems developer',
    ],

    'learning': [
        'instructional designer',
        'learning designer',
        'learning experience designer',
        'e-learning developer',
        'elearning developer',
        'training content developer',
        'curriculum developer',
        'lms administrator',
        'digital learning specialist',
        'learning and development coordinator',
        'training coordinator',
    ],

    'marketing': [
        'digital marketing specialist',
        'marketing coordinator',
        'content marketer',
        'social media specialist',
        'seo specialist',
        'sem specialist',
        'marketing executive',
        'brand executive',
        'email marketing specialist',
        'performance marketing specialist',
        'campaign coordinator',
    ],

    'data': [
        'data analyst',
        'junior data analyst',
        'business intelligence analyst',
        'bi analyst',
        'power bi analyst',
        'reporting analyst',
        'sql analyst',
        'data reporting analyst',
        'analytics analyst',
        'excel analyst',
    ],

    'customer_service': [
        'customer service representative',
        'customer support representative',
        'customer service assistant',
        'customer care executive',
        'call center agent',
        'contact center agent',
        'client support specialist',
        'guest service agent',
        'front desk agent',
        'receptionist',
        'service advisor',
    ],

    'sales': [
        'sales assistant',
        'sales associate',
        'sales executive',
        'sales representative',
        'retail sales associate',
        'business development executive',
        'account executive',
        'inside sales representative',
        'sales coordinator',
        'telesales executive',
    ],

    'retail': [
        'retail assistant',
        'retail associate',
        'store assistant',
        'store associate',
        'cashier',
        'sales assistant',
        'shop assistant',
        'merchandiser',
        'visual merchandiser',
        'store supervisor',
        'retail supervisor',
    ],

    'admin': [
        'administrative assistant',
        'admin assistant',
        'office assistant',
        'office administrator',
        'data entry clerk',
        'document controller',
        'operations assistant',
        'executive assistant',
        'personal assistant',
        'receptionist',
        'office coordinator',
    ],

    'hr': [
        'hr assistant',
        'human resources assistant',
        'hr coordinator',
        'recruitment coordinator',
        'talent acquisition coordinator',
        'recruiter',
        'payroll assistant',
        'people operations assistant',
        'hr administrator',
    ],

    'finance': [
        'finance assistant',
        'accounts assistant',
        'accounting assistant',
        'bookkeeper',
        'junior accountant',
        'accounts payable assistant',
        'accounts receivable assistant',
        'finance analyst',
        'billing assistant',
        'payroll assistant',
    ],

    'healthcare': [
        'healthcare assistant',
        'care assistant',
        'nursing assistant',
        'medical assistant',
        'clinic assistant',
        'patient service associate',
        'caregiver',
        'support worker',
        'pharmacy assistant',
        'dental assistant',
    ],

    'logistics': [
        'warehouse assistant',
        'warehouse associate',
        'logistics assistant',
        'supply chain assistant',
        'delivery driver',
        'driver',
        'picker packer',
        'inventory assistant',
        'stock controller',
        'storekeeper',
        'operations assistant',
    ],

    'design': [
        'graphic designer',
        'junior graphic designer',
        'ui designer',
        'ux designer',
        'ui ux designer',
        'visual designer',
        'product designer',
        'web designer',
        'creative designer',
        'multimedia designer',
    ],

    'cybersecurity': [
        'cybersecurity analyst',
        'security analyst',
        'soc analyst',
        'information security analyst',
        'it security analyst',
        'security engineer',
        'junior security analyst',
        'network security analyst',
    ],

    'education': [
        'teaching assistant',
        'teacher assistant',
        'tutor',
        'teacher',
        'english teacher',
        'school assistant',
        'education assistant',
        'academic coordinator',
        'student support officer',
        'learning support assistant',
    ],
}


def strip_html(value: str) -> str:
    value = re.sub(r'<[^>]+>', ' ', value or '')
    return re.sub(r'\s+', ' ', html.unescape(value)).strip()


def parse_job_date(value: Any) -> datetime | None:
    if value is None or value == '':
        return None

    if isinstance(value, int):
        try:
            return datetime.fromtimestamp(value, tz=timezone.utc)
        except Exception:
            return None

    text = str(value).strip()

    if text.isdigit():
        try:
            return datetime.fromtimestamp(int(text), tz=timezone.utc)
        except Exception:
            return None

    try:
        parsed = datetime.fromisoformat(text.replace('Z', '+00:00'))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed
    except Exception:
        return None


def job_age_days(job: dict[str, Any]) -> int | None:
    parsed = parse_job_date(job.get('published_at'))
    if not parsed:
        return None

    now = datetime.now(timezone.utc)
    return max(0, (now - parsed).days)


def max_days_to_jsearch_date_posted(max_days_old: int = 30) -> str:
    try:
        days = int(max_days_old)
    except Exception:
        days = 30

    if days <= 1:
        return 'today'
    if days <= 3:
        return '3days'
    if days <= 7:
        return 'week'

    return 'month'


def is_recent_job(job: dict[str, Any], max_days_old: int = 30) -> bool:
    age = job_age_days(job)

    if age is None:
        return True

    return age <= max_days_old


def normalize_sort_value(value: str = '') -> str:
    value = str(value or '').lower().strip()

    if value in {'oldest', 'old'}:
        return 'oldest'

    if value in {'recent', 'newest', 'latest', 'most_recent'}:
        return 'recent'

    return 'relevance'


def normalize_job_location(item: dict[str, Any]) -> str:
    direct_location = item.get('job_location') or ''
    city = item.get('job_city') or ''
    state = item.get('job_state') or ''
    country = item.get('job_country') or ''

    parts = [part for part in [city, state, country] if part]

    return direct_location or ', '.join(parts) or ('Remote' if item.get('job_is_remote') else '')


def normalize_salary(item: dict[str, Any]) -> dict[str, Any]:
    return {
        'salary': item.get('job_salary'),
        'min_salary': item.get('job_min_salary'),
        'max_salary': item.get('job_max_salary'),
        'salary_period': item.get('job_salary_period'),
    }


def normalize_jsearch_job(item: dict[str, Any]) -> dict[str, Any]:
    highlights = item.get('job_highlights') or {}
    required_experience = item.get('job_required_experience') or {}
    required_education = item.get('job_required_education') or {}

    tags: list[str] = []

    employment_type = item.get('job_employment_type') or ''
    if employment_type:
        tags.append(str(employment_type))

    employment_types = item.get('job_employment_types') or []
    if isinstance(employment_types, list):
        tags.extend(str(value) for value in employment_types if value)

    if item.get('job_is_remote'):
        tags.append('Remote')

    salary_info = normalize_salary(item)

    return {
        'source': item.get('job_publisher') or 'JSearch',
        'source_job_id': item.get('job_id') or '',
        'title': item.get('job_title') or '',
        'company': item.get('employer_name') or '',
        'location': normalize_job_location(item),
        'url': item.get('job_apply_link') or item.get('job_google_link') or '',
        'tags': tags,
        'description': strip_html(item.get('job_description') or '')[:900],
        'published_at': item.get('job_posted_at_datetime_utc') or '',
        'posted_text': item.get('job_posted_at') or '',
        'employment_type': employment_type,
        'is_remote': bool(item.get('job_is_remote')),
        'apply_options': item.get('apply_options') or [],
        'highlights': highlights,
        'required_experience': required_experience,
        'required_education': required_education,
        'salary_info': salary_info,
        'salary': salary_info.get('salary'),
        'min_salary': salary_info.get('min_salary'),
        'max_salary': salary_info.get('max_salary'),
        'salary_period': salary_info.get('salary_period'),
    }


def title_match_score(job: dict[str, Any], query: str, search_terms: list[str] | None = None) -> int:
    title = str(job.get('title') or '').lower()
    description = str(job.get('description') or '').lower()

    terms = search_terms or [query]

    score = 0

    for term in terms:
        clean_term = re.sub(r'\s+', ' ', term or '').lower().strip()

        if not clean_term:
            continue

        if clean_term in title:
            score += 40

        words = [
            word
            for word in re.findall(r'[a-z0-9+#.&]+', clean_term)
            if len(word) > 2
        ]

        for word in words:
            if re.search(rf'\b{re.escape(word)}\b', title):
                score += 12
            elif re.search(rf'\b{re.escape(word)}\b', description):
                score += 2

    return score


def title_matches(job: dict[str, Any], query: str, search_terms: list[str] | None = None) -> bool:
    title = str(job.get('title') or '').lower()
    query_clean = re.sub(r'\s+', ' ', query or '').lower().strip()

    terms = search_terms or [query_clean]

    for term in terms:
        clean_term = re.sub(r'\s+', ' ', term or '').lower().strip()

        if not clean_term:
            continue

        words = [
            word
            for word in re.findall(r'[a-z0-9+#.&]+', clean_term)
            if len(word) > 2
        ]

        if not words:
            continue

        # Single-word title match: waiter, server, cashier, etc.
        if len(words) == 1:
            if re.search(rf'\b{re.escape(words[0])}\b', title):
                return True

        # Multi-word title match: restaurant server, data analyst, service crew, etc.
        else:
            if all(re.search(rf'\b{re.escape(word)}\b', title) for word in words):
                return True

    return False

def build_manual_search_terms(query: str) -> list[str]:
    clean_query = re.sub(r'\s+', ' ', query or '').strip()
    key = clean_query.lower()

    terms = [clean_query]

    if key in JOB_TITLE_SYNONYMS:
        terms.extend(JOB_TITLE_SYNONYMS[key])

    output: list[str] = []
    seen: set[str] = set()

    for term in terms:
        clean = re.sub(r'\s+', ' ', term or '').strip()
        lookup = clean.lower()

        if clean and lookup not in seen:
            output.append(clean)
            seen.add(lookup)

    # Important for speed:
    # Do not search 10+ synonyms on every request.
    return output[:MAX_FAST_SEARCH_TERMS]

def fetch_jsearch_jobs(
    query: str,
    country: str = '',
    max_days_old: int = 30,
    page: int = 1,
    num_pages: int = 1,
) -> list[dict[str, Any]]:
    if not settings.JSEARCH_API_KEY:
        return []

    query_text = re.sub(r'\s+', ' ', query or '').strip()
    country = (country or '').lower().strip()
    country_name = COUNTRY_NAMES.get(country, '')

    # Country is now the only location filter.
    # Example: "Waiter in Singapore"
    if country_name and country:
        query_text = f'{query_text} in {country_name}'

    params = {
        'query': query_text,
        'page': str(page),
        'num_pages': str(num_pages),
        'date_posted': max_days_to_jsearch_date_posted(max_days_old),
    }

    if country:
        params['country'] = country

    encoded = urllib.parse.urlencode(params)
    host = settings.JSEARCH_API_HOST or 'jsearch.p.rapidapi.com'
    url = f'https://{host}/search?{encoded}'

    cache_key = f'jsearch:v2:{country}:{max_days_old}:{page}:{num_pages}:{query_text.lower()}'
    cached_jobs = cache.get(cache_key)

    if cached_jobs is not None:
        return cached_jobs

    request = urllib.request.Request(
        url,
        headers={
            'User-Agent': 'CareerLensFinalYearProject/1.0',
            'X-RapidAPI-Key': settings.JSEARCH_API_KEY,
            'X-RapidAPI-Host': host,
        },
    )

    with urllib.request.urlopen(request, timeout=JSEARCH_TIMEOUT_SECONDS) as response:  # nosec
        payload = json.loads(response.read().decode('utf-8', errors='replace'))

    jobs = [
        normalize_jsearch_job(item)
        for item in payload.get('data') or []
        if isinstance(item, dict)
    ]

    cache.set(cache_key, jobs, JSEARCH_CACHE_SECONDS)

    return jobs

def search_jobs(
    query: str = '',
    country: str = '',
    sort: str = 'relevance',
    max_days_old: int = 30,
    limit: int = 24,
) -> dict[str, Any]:
    query = re.sub(r'\s+', ' ', query or '').strip()
    country = (country or '').lower().strip()

    try:
        max_days_old = int(max_days_old)
    except Exception:
        max_days_old = 30

    max_days_old = max(1, min(max_days_old, 30))
    sort = normalize_sort_value(sort)

    if not query:
        return {
            'query_profile': {
                'primary_query': '',
                'country': country,
                'country_name': COUNTRY_NAMES.get(country, ''),
                'sort': sort,
                'max_days_old': max_days_old,
            },
            'jobs': [],
            'fallback_links': [],
            'sources': ['JSearch'],
            'errors': [],
            'message': 'Enter a job title and click Search.',
            'disclaimer': 'Job listings come from JSearch/RapidAPI and may change quickly. Always verify details on the source site before applying.',
        }

    jobs: list[dict[str, Any]] = []
    errors: list[str] = []

    search_terms = build_manual_search_terms(query)

    for index, term in enumerate(search_terms):
        try:
            fetched_jobs = fetch_jsearch_jobs(
                query=term,
                country=country,
                max_days_old=max_days_old,
                page=1,
                num_pages=1,
            )

            jobs.extend(fetched_jobs)

        # If the first search already gives enough results, stop early.
            if index == 0 and len(fetched_jobs) >= limit:
                break

        # If we already have enough raw jobs, stop.
            if len(jobs) >= limit * 2:
               break

        except Exception as exc:
            errors.append(f'JSearch unavailable for "{term}": {exc}')

    deduped: list[dict[str, Any]] = []
    seen: set[str] = set()

    for job in jobs:
        key = (
            job.get('source_job_id')
            or job.get('url')
            or f"{job.get('title')}|{job.get('company')}|{job.get('location')}"
        )
        key = str(key).lower()

        if not key or key in seen:
            continue

        if not is_recent_job(job, max_days_old=max_days_old):
            continue

        if not title_matches(job, query, search_terms):
            continue
        
        job['match_score'] = title_match_score(job, query, search_terms)
        job['age_days'] = job_age_days(job)

        deduped.append(job)
        seen.add(key)

    if sort == 'recent':
        deduped.sort(
            key=lambda item: parse_job_date(item.get('published_at')) or datetime.min.replace(tzinfo=timezone.utc),
            reverse=True,
        )
    elif sort == 'oldest':
        deduped.sort(
            key=lambda item: parse_job_date(item.get('published_at')) or datetime.max.replace(tzinfo=timezone.utc),
        )
    else:
        deduped.sort(key=lambda item: item.get('match_score', 0), reverse=True)

    fallback_location = COUNTRY_NAMES.get(country, '')

    fallback_links = [
        {
            'label': f'LinkedIn search: {query}',
            'url': f'https://www.linkedin.com/jobs/search/?keywords={urllib.parse.quote(query)}&location={urllib.parse.quote(fallback_location)}',
        },
        {
            'label': f'Indeed search: {query}',
            'url': f'https://www.indeed.com/jobs?q={urllib.parse.quote(query)}&l={urllib.parse.quote(fallback_location)}',
        },
        {
            'label': f'Google Jobs search: {query}',
            'url': f'https://www.google.com/search?q={urllib.parse.quote(query + " jobs " + fallback_location)}',
        },
    ]

    return {
        'query_profile': {
            'primary_query': query,
            'expanded_queries': search_terms,
            'country': country,
            'country_name': COUNTRY_NAMES.get(country, ''),
            'sort': sort,
            'max_days_old': max_days_old,
            'date_posted': max_days_to_jsearch_date_posted(max_days_old),
        },
        'jobs': deduped[:limit],
        'fallback_links': fallback_links,
        'sources': ['JSearch'],
        'errors': errors[:5],
        'disclaimer': 'Job listings come from JSearch/RapidAPI and may change quickly. Always verify details on the source site before applying.',
    }
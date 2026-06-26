from __future__ import annotations

import json
import logging
import re
import time
from typing import Any

from django.conf import settings

try:
    from google import genai
    from google.genai import types
except Exception:  # pragma: no cover
    genai = None
    types = None

logger = logging.getLogger(__name__)

MAX_RESUME_CHARS = 7000
MAX_JOB_DESCRIPTION_CHARS = 5000


DEFAULT_INTERVIEW_PREP_RESULT: dict[str, Any] = {
    'engine': 'gemini_interview_prep',
    'status': 'unavailable',
    'interview_title': '',
    'target_role': '',
    'interview_type': '',
    'difficulty': '',
    'main_risk_area': '',
    'self_intro': '',
    'resume_talking_points': [],
    'questions': [],
    'tough_questions': [],
    'questions_to_ask': [],
    'final_tips': [],
    'safety_notes': [],
    'message': '',
}


INTERVIEW_TYPE_CONFIG: dict[str, dict[str, str]] = {
    'role_specific': {
        'label': 'Role-specific',
        'category': 'Role-specific',
        'focus': (
            'Ask realistic questions about the actual target job, daily responsibilities, '
            'service standards, expected tasks, job-specific requirements, and role fit.'
        ),
    },
    'behavioral': {
        'label': 'Behavioral',
        'category': 'Behavioral',
        'focus': (
            'Ask people, teamwork, communication, pressure, conflict, reliability, mistake-handling, '
            'customer-handling, and professionalism questions.'
        ),
    },
    'technical_practical': {
        'label': 'Technical / Practical',
        'category': 'Technical / Practical',
        'focus': (
            'Ask practical workplace scenario questions about tools, systems, workflow, accuracy, '
            'procedures, hands-on tasks, safety, quality, and real task execution.'
        ),
    },
    'final_round': {
        'label': 'Final round',
        'category': 'Final round',
        'focus': (
            'Ask decision-stage questions about motivation, fit, availability, strengths, weaknesses, '
            'salary expectations, long-term goals, company interest, and why the candidate should be hired.'
        ),
    },
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
                item.get('text')
                or item.get('question')
                or item.get('answer')
                or item.get('sample_answer')
                or item.get('title')
                or item.get('label')
                or item.get('value')
                or item.get('reason')
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

    return text[:limit] + '\n[Text truncated for interview prep context length.]'


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


def _load_json_object(text: str) -> dict[str, Any]:
    payload = json.loads(_strip_json_code_fence(text))

    if not isinstance(payload, dict):
        raise ValueError('Gemini returned JSON that is not an object.')

    return payload

def _configured_interview_api_keys() -> list[str]:
    raw_values = [
        getattr(settings, 'GEMINI_INTERVIEW_API_KEYS', []),
        getattr(settings, 'GEMINI_INTERVIEW_API_KEY', ''),
        getattr(settings, 'GEMINI_INTERVIEW_API_KEY_2', ''),
        getattr(settings, 'GEMINI_INTERVIEW_API_KEY_3', ''),
        getattr(settings, 'GEMINI_API_KEYS', []),
        getattr(settings, 'GEMINI_API_KEY', ''),
        getattr(settings, 'GEMINI_API_KEY_2', ''),
        getattr(settings, 'GEMINI_API_KEY_3', ''),
    ]
    keys: list[str] = []

    for value in raw_values:
        values = value if isinstance(value, (list, tuple, set)) else str(value).split(',')

        for item in values:
            key = str(item or '').strip()

            if key and key not in keys:
                keys.append(key)

    return keys


def _gemini_retry_attempts() -> int:
    try:
        return max(1, int(getattr(settings, 'GEMINI_RETRY_ATTEMPTS', 1) or 1))
    except (TypeError, ValueError):
        return 1


def _gemini_key_switch_delay_seconds() -> int:
    try:
        return max(0, int(getattr(settings, 'GEMINI_KEY_SWITCH_DELAY_SECONDS', 2) or 0))
    except (TypeError, ValueError):
        return 2


def _rotate_api_keys(api_keys: list[str]) -> list[str]:
    if len(api_keys) <= 1:
        return api_keys

    start_index = time.monotonic_ns() % len(api_keys)
    return api_keys[start_index:] + api_keys[:start_index]


def _generate_interview_json_with_key_fallback(
    *,
    contents: str,
    model: str,
    temperature: float = 0.35,
) -> dict[str, Any]:
    api_keys = _rotate_api_keys(_configured_interview_api_keys())

    if not api_keys:
        raise RuntimeError('No Gemini API keys are configured on the backend.')

    errors: list[str] = []
    model = model or getattr(settings, 'GEMINI_MODEL', 'gemini-2.5-flash-lite')
    attempts_per_key = _gemini_retry_attempts()
    delay_seconds = _gemini_key_switch_delay_seconds()

    for attempt in range(1, attempts_per_key + 1):
        for key_index, api_key in enumerate(api_keys, start=1):
            try:
                client = genai.Client(api_key=api_key)
                response = client.models.generate_content(
                    model=model,
                    contents=contents,
                    config=types.GenerateContentConfig(
                        temperature=temperature,
                        response_mime_type='application/json',
                        max_output_tokens=3500,
                    ),
                )

                text = getattr(response, 'text', '') or ''
                return _load_json_object(text)

            except Exception as exc:
                errors.append(f'key #{key_index}, attempt #{attempt}: {exc}')

                has_next_key = key_index < len(api_keys)
                has_next_attempt = attempt < attempts_per_key

                if delay_seconds and (has_next_key or has_next_attempt):
                    time.sleep(delay_seconds)

    last_error = errors[-1] if errors else 'unknown error'
    raise RuntimeError(
        f'Gemini interview prep failed after {len(errors)} request attempt(s) '
        f'across {len(api_keys)} Gemini API key(s). Last error: {last_error}'
    )

def _interview_type_config(interview_type: str) -> dict[str, str]:
    key = _clean_string(interview_type).lower()
    return INTERVIEW_TYPE_CONFIG.get(key, INTERVIEW_TYPE_CONFIG['role_specific'])


def _extract_candidate_name(resume_text: str) -> str:
    lines = [
        _clean_string(line)
        for line in (resume_text or '').splitlines()
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
    }

    for line in lines[:12]:
        clean = re.sub(r'[^A-Za-z .\'-]', '', line).strip()
        words = clean.split()

        if not (2 <= len(words) <= 5):
            continue

        lower = clean.lower()

        if any(word in lower for word in bad_words):
            continue

        if all(word[:1].isupper() for word in words if word):
            return clean

    return ''


def _normalize_question(value: Any, index: int, category: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        value = {'question': value}

    question = {
        'id': _clean_string(value.get('id')) or f'q{index + 1}',
        'category': category,
        'question': _clean_string(value.get('question')),
        'sample_answer': _clean_multiline(
            value.get('sample_answer')
            or value.get('answer')
            or value.get('sample')
        ),
    }

    if not question['question']:
        question['question'] = 'Tell me about yourself and why you are interested in this role.'

    if not question['sample_answer']:
        question['sample_answer'] = (
            'Use a truthful example from your own experience. Keep the answer clear, professional, '
            'and connected to the target role. Avoid claiming skills or achievements that are not true.'
        )

    return question


def _role_bucket(job_title: str, job_description: str) -> str:
    text = f'{job_title} {job_description}'.lower()

    if any(term in text for term in ['server', 'waiter', 'waitress', 'restaurant', 'hospitality', 'guest', 'food', 'beverage', 'bar', 'cafe']):
        return 'hospitality'

    if any(term in text for term in ['frontend', 'front-end', 'react', 'javascript', 'typescript', 'developer', 'software', 'engineer', 'it support']):
        return 'technology'

    if any(term in text for term in ['admin', 'office', 'assistant', 'reception', 'clerical', 'data entry']):
        return 'admin'

    if any(term in text for term in ['sales', 'retail', 'cashier', 'customer service', 'store assistant']):
        return 'customer_service'

    if any(term in text for term in ['nurse', 'care assistant', 'healthcare', 'patient', 'clinic', 'medical']):
        return 'healthcare'

    return 'general'


def _fallback_questions(
    *,
    job_title: str,
    job_description: str,
    interview_type: str,
) -> list[dict[str, Any]]:
    type_config = _interview_type_config(interview_type)
    category = type_config['category']
    bucket = _role_bucket(job_title, job_description)

    hospitality = {
        'role_specific': [
            ('How do you manage multiple tables during peak service?', 'During a busy service period, I would stay organized by tracking each table stage: greeting, ordering, food delivery, check-back, and payment. I would prioritize urgent needs, enter orders carefully, communicate with the kitchen or bar, and keep guests updated. My goal would be to stay calm, avoid mistakes, and make sure each guest still feels attended to.'),
            ('How would you create a positive dining experience for a first-time guest?', 'I would welcome the guest warmly, explain the menu clearly, and ask about preferences or dietary needs before making recommendations. I would check back at the right time without interrupting too much and make sure the table feels comfortable throughout the visit. A first-time guest should leave feeling respected, guided, and confident about returning.'),
            ('How would you handle a guest complaint about food or service?', 'I would listen calmly, avoid interrupting, and acknowledge the guest’s concern. I would apologize for the inconvenience, clarify the issue, and take quick action by informing the kitchen or supervisor when needed. I would keep the guest updated and stay professional. Good service recovery can turn a bad moment into a better final impression.'),
            ('How do you make sure orders are accurate before sending them to the kitchen?', 'I would repeat or confirm important details, especially modifications, allergies, table numbers, and special requests. Before sending the order, I would quickly review the items and make sure nothing is missing. If something is unclear, I would ask again instead of guessing. Accuracy protects both the guest experience and the kitchen workflow.'),
            ('How would you support the team during a very busy shift?', 'I would stay aware of my own section while also looking for small ways to support the wider team. If a colleague needs help, I can assist with clearing tables, running food, resetting the dining area, or updating guests. Strong service depends on teamwork, especially during peak hours when everyone needs to communicate clearly.'),
        ],
        'behavioral': [
            ('Tell me about a time you worked under pressure.', 'In a busy service environment, I had to handle several guest requests at the same time while keeping orders accurate. I stayed calm, prioritized urgent needs, and communicated with the team. By focusing on one task at a time and keeping guests updated, I helped the service move smoothly and maintained a professional attitude.'),
            ('Tell me about a time you handled a difficult guest.', 'A guest was unhappy because their order was delayed during a busy period. I listened calmly, apologized for the wait, checked the order status, and kept the guest updated. I also informed the supervisor so we could recover the experience properly. The guest appreciated the communication, and I learned the value of staying calm.'),
            ('Describe a time you helped a teammate.', 'During a busy shift, I noticed a teammate was falling behind with clearing and resetting tables. After making sure my own guests were settled, I helped clear plates, reset tables, and update waiting guests. This helped the team keep service moving and reminded me that teamwork directly affects guest satisfaction.'),
            ('Tell me about a time you made a mistake at work.', 'If I make a mistake, I believe it is important to take responsibility quickly. In a service situation, I would inform the right person, correct the issue, and communicate professionally. I would also learn from the mistake so it does not happen again. Accuracy and accountability are very important in hospitality.'),
            ('How do you stay motivated during tiring shifts?', 'I stay motivated by focusing on the guest experience and the team around me. Even when work feels repetitive, each guest interaction is a chance to provide good service. I try to keep a positive attitude, stay organized, and support colleagues because that helps the shift feel smoother and more productive.'),
        ],
        'technical_practical': [
            ('How comfortable are you with POS systems?', 'I understand that POS accuracy is very important in restaurant service. When using a POS system, I carefully enter the order, check modifiers, confirm table numbers, and review special requests. If I am learning a new system, I ask questions early and practice until I am confident. I prefer to double-check rather than risk mistakes.'),
            ('How do you handle food allergies or dietary requests?', 'I take allergies and dietary requests seriously. I would listen carefully, confirm the details with the guest, and communicate clearly with the kitchen. If I am unsure about an ingredient, I would not guess. I would check with the chef or supervisor to make sure the guest receives accurate and safe information.'),
            ('How do you maintain hygiene and cleanliness during service?', 'I maintain cleanliness by keeping tables, service stations, menus, and utensils organized and clean throughout the shift. I follow hygiene procedures, clear used items quickly, and avoid cross-contamination. Cleanliness is part of the guest experience and also shows professionalism, so I treat it as an ongoing responsibility.'),
            ('How would you upsell without making the guest uncomfortable?', 'I would make recommendations based on the guest’s preferences instead of pushing expensive items. For example, I might suggest a popular dish, side, dessert, or drink pairing that matches their order. Good upselling should feel helpful and natural, not forced. The guest should feel guided, not pressured.'),
            ('What would you do if the kitchen is delayed and guests are waiting?', 'I would check the order status, update the guests honestly, and apologize for the delay. I would avoid disappearing because guests usually appreciate clear communication. If the delay is serious, I would inform a supervisor and ask what recovery option is appropriate. Keeping guests informed helps reduce frustration.'),
        ],
        'final_round': [
            ('Why do you want to work as a server here?', 'I am interested in this server role because it matches my service experience and my interest in creating positive guest experiences. I enjoy working in a team, communicating with guests, and staying active during service. I also want to keep improving my hospitality skills and contribute to a restaurant that values professionalism and quality service.'),
            ('What makes you a strong fit for this role?', 'I believe I am a strong fit because I understand the importance of guest service, teamwork, accuracy, and staying calm under pressure. I am comfortable learning new menus, following procedures, and supporting colleagues during busy shifts. I also bring a positive attitude and willingness to improve, which are important in hospitality.'),
            ('Are you comfortable with rotating shifts, weekends, and busy service hours?', 'Yes, I understand that hospitality roles often require flexibility, including weekends, evenings, and busy service periods. I am prepared for that kind of schedule and understand that reliability is very important for the team. I would make sure I communicate clearly about availability and show up prepared for each shift.'),
            ('What are your strengths as a server?', 'My strengths are communication, patience, teamwork, and attention to detail. I try to make guests feel welcome while also keeping service organized. I understand that small details, like order accuracy, timing, and cleanliness, can strongly affect the guest experience. I also stay calm when service becomes busy.'),
            ('Where do you see yourself growing in hospitality?', 'I want to continue growing my service skills, menu knowledge, and ability to handle different guest situations professionally. Over time, I would like to become someone the team can rely on during busy service and possibly take on more responsibility. For now, my focus is to learn quickly and perform well in this role.'),
        ],
    }

    generic = {
        'role_specific': [
            (f'Why are you interested in the {job_title or "target"} role?', f'I am interested in this role because it matches my background and the kind of work I want to grow in. I believe my communication, responsibility, and willingness to learn can help me contribute well. I would connect my experience to the job requirements and show that I am ready to support the team professionally.'),
            ('What experience from your resume is most relevant to this role?', 'The most relevant experience from my resume is my ability to communicate clearly, stay organized, and complete tasks responsibly. I would connect my past work, education, or project experience to the requirements of this role. I would also explain how those experiences helped me build skills that can transfer into this position.'),
            ('How would you learn the responsibilities of this role quickly?', 'I would start by understanding the main tasks, asking questions when something is unclear, and observing how experienced team members work. I would take notes, apply feedback, and focus on accuracy. I believe learning quickly requires humility, consistency, and a willingness to improve through practice.'),
            ('What would you do if you were given a task you had not done before?', 'I would first make sure I understand the expected outcome and any important steps or rules. If I am unsure, I would ask a clear question rather than guessing. Then I would complete the task carefully and learn from feedback. I prefer to be honest and accurate instead of pretending I already know everything.'),
            ('How would you make sure your work meets the employer’s expectations?', 'I would listen carefully to instructions, clarify priorities, and check my work before submitting or completing it. I would also pay attention to feedback and adjust quickly. For me, meeting expectations means being reliable, communicating clearly, and taking responsibility for the quality of my work.'),
        ],
        'behavioral': [
            ('Tell me about a time you worked under pressure.', 'In a previous situation, I had to manage several tasks at the same time. I stayed calm, identified the most urgent tasks, communicated clearly, and focused on completing the work properly. That experience helped me improve my ability to stay organized under pressure and keep a professional attitude.'),
            ('Tell me about a time you worked with a team.', 'I worked with a team where communication and cooperation were important. I made sure I understood my responsibilities, helped where needed, and kept others updated. The experience showed me that teamwork depends on reliability, respect, and clear communication, especially when tasks need to be completed quickly.'),
            ('Tell me about a time you received feedback.', 'When I receive feedback, I try to listen carefully and understand what I can improve. I do not take it personally because feedback helps me grow. I would ask questions if needed, apply the advice, and show improvement through my actions. I believe being coachable is important in any workplace.'),
            ('Tell me about a time you solved a problem.', 'In a previous situation, I noticed a problem that could affect the work outcome. I stayed calm, looked at the available options, and chose the most practical solution. If needed, I communicated with the right person. The experience taught me that problem-solving is about staying focused and taking responsible action.'),
            ('Tell me about a time you made a mistake.', 'If I make a mistake, I believe the best response is to take responsibility quickly. I would inform the right person, correct the issue if possible, and learn from it. I would also think about what caused the mistake so I can avoid repeating it. Accountability is important for building trust at work.'),
        ],
        'technical_practical': [
            ('What practical skills would help you succeed in this role?', 'The practical skills that would help me succeed include communication, organization, attention to detail, and the ability to learn tools or procedures quickly. I would make sure I understand the workflow, ask questions when needed, and apply feedback so I can perform the role accurately and professionally.'),
            ('How do you make sure your work is accurate?', 'I make sure my work is accurate by checking details, following instructions carefully, and asking questions if something is unclear. I prefer to clarify early rather than make assumptions. After completing a task, I review it where possible to reduce mistakes and improve the quality of my work.'),
            ('How do you learn a new tool, system, or process?', 'I learn a new tool or process by first understanding the purpose, then following the steps carefully. I ask questions when needed, take notes, and practice until I become comfortable. I also pay attention to common mistakes so I can avoid them and become productive faster.'),
            ('How would you handle competing tasks with the same deadline?', 'I would clarify priorities first and understand which task has the greatest impact. Then I would organize the work into smaller steps and communicate if there is a risk of delay. I believe it is better to be transparent early rather than wait until the deadline becomes a problem.'),
            ('What would you do if you noticed a process could be improved?', 'I would first make sure I understand the current process and why it is done that way. If I see a practical improvement, I would respectfully suggest it to the right person. I would avoid criticizing and focus on how the change could save time, reduce mistakes, or improve quality.'),
        ],
        'final_round': [
            ('Why should we choose you for this position?', 'You should choose me because I am responsible, willing to learn, and serious about doing the job well. I understand that every role requires reliability, communication, and a positive attitude. I may still have areas to improve, but I am honest about my learning and committed to contributing properly to the team.'),
            ('What are your long-term goals?', 'My long-term goal is to continue building strong professional experience and become more confident in my field. I want to keep improving my skills, take on more responsibility over time, and contribute to a team where I can grow. Right now, my priority is to perform well in this role and learn as much as possible.'),
            ('What are your strengths?', 'My strengths are reliability, communication, willingness to learn, and attention to detail. I try to understand what is expected, complete tasks properly, and support the people around me. I also stay open to feedback because I know that improvement is important in any role.'),
            ('What is one area you are working to improve?', 'One area I am working to improve is building more confidence in new situations. I am improving this by preparing properly, asking questions when needed, and learning from feedback. I see improvement as part of professional growth, and I am willing to put in the effort to get better.'),
            ('Do you have any questions for us?', 'Yes, I would like to understand what success looks like in the first few months and what training or support is provided for new team members. I would also like to know what qualities your strongest employees in this role usually have, so I can prepare myself to meet those expectations.'),
        ],
    }

    source = hospitality if bucket == 'hospitality' else generic
    items = source.get(interview_type, source['role_specific'])

    return [
        {
            'id': f'q{index + 1}',
            'category': category,
            'question': question,
            'sample_answer': answer,
        }
        for index, (question, answer) in enumerate(items)
    ]


def _default_questions_to_ask(job_title: str = '') -> list[str]:
    role = _clean_string(job_title) or 'this role'

    return [
        f'What does success look like in the first three months for {role}?',
        'What training or onboarding is provided for new team members?',
        'What are the most common challenges someone in this role faces?',
        'What qualities do your strongest employees in this position usually have?',
        'How does the team usually give feedback and support new employees?',
    ]


def _default_final_tips() -> list[str]:
    return [
        'Practice your answers aloud, not only in your head.',
        'Replace sample answers with truthful examples from your own experience.',
        'Prepare one strong example about teamwork, pressure, and learning quickly.',
        'Be honest about skill gaps and explain how you would learn.',
        'Prepare two questions to ask the employer before the interview ends.',
    ]


def _default_safety_notes() -> list[str]:
    return [
        'Do not claim skills, certificates, tools, or experience that are not true.',
        'Use the sample answers as a guide, then rewrite them in your own voice.',
    ]


def _default_tough_questions(job_title: str = '') -> list[dict[str, Any]]:
    role = _clean_string(job_title) or 'this role'

    return [
        {
            'id': 'tough-1',
            'category': 'Gap Defense',
            'question': f'The job description may include requirements not clearly shown in your resume. How would you handle that for {role}?',
            'sample_answer': (
                'That area is something I am still developing, but I have related experience that would help me learn quickly. '
                'I am comfortable asking questions, following training, and applying feedback. I would be honest about what I know, '
                'while making sure I improve quickly and support the team properly.'
            ),
        }
    ]


def _normalize_questions(
    questions: Any,
    category: str,
) -> list[dict[str, Any]]:
    clean: list[dict[str, Any]] = []

    if isinstance(questions, list):
        for item in questions:
            clean.append(_normalize_question(item, len(clean), category))

    return clean


def _merge_result(
    payload: dict[str, Any],
    *,
    status: str = 'success',
    job_title: str = '',
    interview_type: str = 'role_specific',
    difficulty: str = 'real_interview',
    job_description: str = '',
) -> dict[str, Any]:
    type_config = _interview_type_config(interview_type)

    result = json.loads(json.dumps(DEFAULT_INTERVIEW_PREP_RESULT))
    result.update(payload or {})

    result['engine'] = 'gemini_interview_prep'
    result['status'] = status

    result['target_role'] = (
        _clean_string(result.get('target_role'))
        or _clean_string(job_title)
        or 'Target Role'
    )
    result['interview_type'] = interview_type
    result['difficulty'] = _clean_string(result.get('difficulty')) or difficulty
    result['interview_title'] = (
        _clean_string(result.get('interview_title'))
        or f'{result["target_role"]} {type_config["label"]} Interview Prep'
    )
    result['main_risk_area'] = (
        _clean_string(result.get('main_risk_area'))
        or 'Prepare truthful examples and avoid claiming unsupported skills.'
    )
    result['self_intro'] = _clean_multiline(result.get('self_intro'))
    result['resume_talking_points'] = _listify(result.get('resume_talking_points'))

    result['questions'] = _normalize_questions(
        result.get('questions'),
        type_config['category'],
    )

    if not result['questions']:
        result['questions'] = _fallback_questions(
            job_title=result['target_role'],
            job_description=job_description,
            interview_type=interview_type,
        )

    result['tough_questions'] = (
        _normalize_questions(result.get('tough_questions'), 'Gap Defense')
        or _default_tough_questions(result['target_role'])
    )

    result['questions_to_ask'] = (
        _listify(result.get('questions_to_ask'))
        or _default_questions_to_ask(result['target_role'])
    )

    result['final_tips'] = (
        _listify(result.get('final_tips'))
        or _default_final_tips()
    )

    result['safety_notes'] = (
        _listify(result.get('safety_notes'))
        or _default_safety_notes()
    )

    result['message'] = _clean_string(result.get('message'))

    if not result['self_intro']:
        result['self_intro'] = (
            f'I am interested in the {result["target_role"]} role because it matches my background, strengths, '
            'and career direction. My experience has helped me build communication, responsibility, attention to detail, '
            'and the ability to learn quickly. I am looking for an opportunity where I can contribute professionally, '
            'support the team, and continue improving my skills.'
        )

    if not result['resume_talking_points']:
        result['resume_talking_points'] = [
            'Connect your answer to the target job description.',
            'Use truthful examples from your resume.',
            'Show willingness to learn where your experience is limited.',
            'Keep answers specific, natural, and professional.',
        ]

    return result


def _fallback_interview_prep(
    *,
    resume_text: str,
    job_title: str,
    job_description: str,
    interview_type: str = 'role_specific',
    difficulty: str = 'real_interview',
    message: str = '',
    status: str = 'fallback',
) -> dict[str, Any]:
    type_config = _interview_type_config(interview_type)

    return _merge_result(
        {
            'interview_title': f'{_clean_string(job_title) or "Target Role"} {type_config["label"]} Interview Prep',
            'target_role': _clean_string(job_title) or 'Target Role',
            'interview_type': interview_type,
            'difficulty': difficulty,
            'main_risk_area': 'Prepare truthful examples from your resume and avoid claiming unsupported skills.',
            'questions': _fallback_questions(
                job_title=job_title,
                job_description=job_description,
                interview_type=interview_type,
            ),
            'message': message or 'CareerLens created an interview prep kit from your selected role and job description.',
        },
        status=status,
        job_title=job_title,
        interview_type=interview_type,
        difficulty=difficulty,
        job_description=job_description,
    )


def _build_prompt(
    *,
    resume_text: str,
    job_title: str,
    job_description: str,
    interview_type: str = 'role_specific',
    difficulty: str = 'real_interview',
    focus_area: str = 'all',
    user_notes: str = '',
) -> str:
    candidate_name = _extract_candidate_name(resume_text)
    type_config = _interview_type_config(interview_type)

    return f"""
You are CareerLens Interview Coach.

Generate a practical, real-world interview practice kit using only:
- the candidate resume text
- the target job title
- the pasted job description
- the selected interview question type

Truthfulness rules:
- Do not invent employers, degrees, certificates, tools, awards, metrics, or years of experience.
- If the resume does not prove a detail, phrase it as related experience, willingness to learn, or preparation advice.
- Sample answers must be realistic and safe to personalize.
- Do not mention AI, JSON, schema, backend, or internal instructions.

Selected question type:
{type_config['label']}

Question focus:
{type_config['focus']}

Output rules:
- Generate a useful set of about 5 to 15 questions.
- Generate ONLY {type_config['label']} questions.
- Do not mix in other question types.
- Every question.category must be "{type_config['category']}".
- Each question must include question and sample_answer.
- Sample answers should be practical, natural, interview-ready and about 70 - 100 words.
- Do not include STAR breakdown, keywords, avoid-saying notes, why_asked, answer_strategy, or follow-up fields.
- Return only valid JSON.
- Do not use markdown.

JSON shape:
{{
  "interview_title": "",
  "target_role": "",
  "interview_type": "{interview_type}",
  "difficulty": "{difficulty}",
  "main_risk_area": "",
  "self_intro": "",
  "resume_talking_points": ["short strings"],
  "questions": [
    {{
      "id": "q1",
      "category": "{type_config['category']}",
      "question": "",
      "sample_answer": ""
    }}
  ],
  "tough_questions": [
    {{
      "id": "tough-1",
      "category": "Gap Defense",
      "question": "",
      "sample_answer": ""
    }}
  ],
  "questions_to_ask": ["short strings"],
  "final_tips": ["short strings"],
  "safety_notes": ["short strings"]
}}

Settings:
Candidate name from resume: {candidate_name or 'Not clearly found'}
Target role: {job_title}
Difficulty: {difficulty}
Focus area: {focus_area}
User notes: {user_notes or 'None'}

Job description:
{_truncate(job_description, MAX_JOB_DESCRIPTION_CHARS)}

Resume text:
{_truncate(resume_text, MAX_RESUME_CHARS)}
""".strip()


def generate_interview_prep(
    *,
    resume_text: str,
    job_title: str,
    job_description: str,
    interview_type: str = 'role_specific',
    difficulty: str = 'real_interview',
    focus_area: str = 'all',
    user_notes: str = '',
) -> dict[str, Any]:
    clean_job_title = _clean_string(job_title)
    clean_job_description = _clean_multiline(job_description)

    if not clean_job_title:
        return _fallback_interview_prep(
            resume_text=resume_text,
            job_title='Target Role',
            job_description=clean_job_description,
            interview_type=interview_type,
            difficulty=difficulty,
            message='Target role was missing, so CareerLens created a general interview prep kit.',
            status='fallback',
        )

    if not clean_job_description:
        return _fallback_interview_prep(
            resume_text=resume_text,
            job_title=clean_job_title,
            job_description='',
            interview_type=interview_type,
            difficulty=difficulty,
            message='Job description was missing, so CareerLens created a general interview prep kit.',
            status='fallback',
        )

    if genai is None or types is None:
        logger.warning('CareerLens interview prep unavailable: google-genai is not installed.')
        
        return _fallback_interview_prep(
            resume_text=resume_text,
            job_title=clean_job_title,
            job_description=clean_job_description,
            interview_type=interview_type,
            difficulty=difficulty,
            message='The enhanced interview coach is temporarily unavailable, so CareerLens created a safe practice kit.',
            status='fallback',
        )

    if not _configured_interview_api_keys():
        logger.warning('CareerLens interview prep unavailable: no Gemini API keys are configured.')

        return _fallback_interview_prep(
            resume_text=resume_text,
            job_title=clean_job_title,
            job_description=clean_job_description,
            interview_type=interview_type,
            difficulty=difficulty,
            message='The enhanced interview coach is temporarily unavailable, so CareerLens created a safe practice kit.',
            status='fallback',
        )

    model = (
        getattr(settings, 'GEMINI_INTERVIEW_MODEL', '')
        or getattr(settings, 'GEMINI_MODEL', '')
        or 'gemini-2.5-flash-lite'
    )

    try:
        payload = _generate_interview_json_with_key_fallback(
            model=model,
            contents=_build_prompt(
                resume_text=resume_text or '',
                job_title=clean_job_title,
                job_description=clean_job_description,
                interview_type=interview_type,
                difficulty=difficulty,
                focus_area=focus_area,
                user_notes=user_notes,
            ),
            temperature=0.35,
        )

        return _merge_result(
            payload,
            status='success',
            job_title=clean_job_title,
            interview_type=interview_type,
            difficulty=difficulty,
            job_description=clean_job_description,
        )

    except Exception as exc:
        logger.exception(
           'CareerLens interview prep generation failed. Technical details are hidden from users. Error: %s',
        exc,
        )

        return _fallback_interview_prep(
            resume_text=resume_text,
            job_title=clean_job_title,
            job_description=clean_job_description,
            interview_type=interview_type,
            difficulty=difficulty,
            message='The enhanced interview coach is temporarily unavailable, so CareerLens created a safe practice kit.',
            status='fallback',
        )
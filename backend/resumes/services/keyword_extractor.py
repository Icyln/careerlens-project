from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

try:  # YAKE is optional. Regex/list extraction keeps the app usable if YAKE is unavailable.
    import yake  # type: ignore
except Exception:  # pragma: no cover
    yake = None  # type: ignore


@dataclass(frozen=True)
class KeywordCandidate:
    name: str
    category: str
    job_keywords: tuple[str, ...]
    source: str
    score: float = 1.0
    meta: dict[str, Any] = field(default_factory=dict)


# Candidate filtering is intentionally stricter than extraction. YAKE proposes phrases;
# these rules decide what is safe and useful to show as ATS keywords.
DYNAMIC_STOP_WORDS = {
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'can', 'candidate', 'company',
    'for', 'from', 'have', 'in', 'is', 'it', 'job', 'must', 'of', 'on', 'or', 'our',
    'related', 'role', 'should', 'that', 'the', 'their', 'this', 'to', 'we', 'with',
    'you', 'your', 'field', 'fields', 'plus', 'preferred', 'required', 'requirement',
    'requirements', 'responsibilities', 'responsibility', 'experience', 'years', 'year',
    'least', 'minimum', 'strong', 'good', 'basic', 'able', 'ability', 'knowledge',
    'understanding', 'hands', 'hand', 'nice', 'including', 'include', 'includes', 'etc',
    'e.g', 'eg', 'i.e', 'ie', 'working', 'work', 'works', 'using', 'use', 'users',
    'members', 'tools', 'tool', 'services', 'service', 'practices', 'practice', 'interest',
    'interested', 'comfortable', 'background', 'approach', 'different', 'fresh', 'graduates',
    'welcome', 'not', 'required', 'performing', 'relevant', 'difficult', 'business', 'solve',
    'appreciation', 'fundamental', 'related', 'equivalent', 'hands-on', 'hands', 'clear', 'possess', 'possesses', 'proficient', 'proficiency', 'similar', 'technologies',
    'technology', 'principles', 'cms', 'web', 'developer', 'developers', 'designing',
}

WEAK_START_WORDS = DYNAMIC_STOP_WORDS | {
    'excellent', 'comfortable', 'background', 'approach', 'ability', 'able', 'strong',
    'basic', 'nice', 'preferably', 'fresh', 'interest', 'performing', 'relevant',
    'possess', 'possesses', 'proficient', 'proficiency', 'web', 'developer',
}
WEAK_END_WORDS = DYNAMIC_STOP_WORDS | {
    'and', 'or', 'to', 'with', 'in', 'of', 'for', 'the', 'a', 'an', 'experience',
    'understanding', 'knowledge', 'interest', 'ability', 'approach', 'field', 'fields',
    'equivalent', 'curious', 'comfortable', 'training', 'designing', 'contributes',
    'possess', 'proficient', 'web', 'technology', 'technologies', 'principles',
}

NOISE_PATTERNS = [
    r'^at least\b', r'^minimum\b', r'^nice to have\b', r'^not required\b',
    r'^strong interest\b', r'^interest in\b', r'^ability to\b', r'^able to\b',
    r'^comfortable working\b', r'^related fields?\b', r'^hands on\b', r'^hands-on\b',
    r'^preferably\b', r'^willingness to\b', r'^appreciation of\b', r'^understanding of\b',
    r'\brelated fields?\b', r'\bor equivalent working experience\b', r'\bteam members\b',
    r'\busers to meet\b', r'\bexperience in\b', r'\bexperience with\b',
    r'\bunderstanding of\b', r'\bappreciation of\b', r'\bhands-on\b', r'\bhands on\b',
    r'\binterest in\b', r'\bequivalent working experience\b', r'\be\s*g\b',
    r'\bperforming relevant research\b', r'\brelevant research to solve\b',
    r'\bresearch to solve difficult\b', r'\bscience or equivalent\b',
    r'\bmeet deadlines interest\b', r'\bdeadlines interest\b',
    r'\btraining ability to break\b', r'\bdesign experience designing\b',
    r'\bstakeholders detail oriented\b', r'\bhospitality with a genuine\b',
    r'\blearning design curious\b', r'\bapproach to learning design\b',
    r'\bbackground in learning design\b', r'\bcontent design experience designing\b',
    r'\bdesign curious\b', r'\bphp web and mobile\b',
    r'\bdevelopment lifecycles and appreciation\b',
    r'\binto clear engaging learning\b',
    r'\bprofessional training or edtech\b',
    r'\btechnology or digital\b',
    r'\bdesign education\b',
    r'\bworkplace learning professional\b',
    r'\btraining or edtech\b',
    r'\beducation psychology\b',
    r'\bpsychology communications\b',
    r'\bbachelor s\b',
    r'\bindependently bachelor\b',
    r'\bs degree in computer\b',
]

# Precise exact-term rules. These terms are shown as clean ATS keywords and are given
# priority over YAKE phrases.
ROLE_KEYWORDS = {
    'developer', 'developers', 'web developer', 'software developer', 'front end developer',
    'front-end developer', 'frontend developer', 'back end developer', 'back-end developer',
    'backend developer', 'full stack developer', 'full-stack developer', 'designer', 'engineer',
    'analyst', 'manager', 'coordinator', 'assistant', 'specialist', 'administrator', 'officer',
}

GENERIC_SINGLE_WORD_NOISE = {
    'web', 'developer', 'developers', 'possess', 'proficient', 'similar', 'tools', 'technology',
    'technologies', 'principles', 'design', 'creative', 'suite', 'cms', 'content', 'management', 'systems', 'such',
}

# Cross-industry quality gates. These are generic JD filler/action words, not
# industry-specific keyword exceptions. They stop YAKE/fallback from turning
# sentence fragments such as "Design And Develop Robust" into hard skills.
GENERAL_QUALITY_NOISE = {
    'solid', 'familiarity', 'familiar', 'fundamentals', 'fundamental', 'modern',
    'preferred', 'optional', 'plus', 'similar', 'basic', 'concept', 'concepts',
    'knowledge', 'understanding', 'comfortable', 'excellent', 'strong', 'good',
    'nice', 'robust', 'responsive', 'evolving', 'new', 'improve', 'improvements',
    'enhance', 'productivity', 'power', 'powered', 'using', 'use', 'uses',
    'build', 'built', 'test', 'tests', 'develop', 'develops', 'developed',
    'design', 'designs', 'designed', 'implement', 'implements', 'implemented',
    'contribute', 'contributes', 'contributed', 'lead', 'leads', 'leading',
    'take', 'takes', 'took', 'introduce', 'introduces', 'introduced', 'find',
    'finds', 'found', 'work', 'works', 'worked', 'with', 'that', 'what', 'who',
    'where', 'when', 'why', 'how', 'this', 'these', 'those', 'such', 'through',
    'across', 'between', 'within', 'into', 'from', 'for', 'about', 'discussion',
    'discussions', 'challenge', 'challenges', 'application', 'applications',
    'frontend', 'frontends', 'backend', 'backends', 'api', 'apis', 'orm',
}

JD_ACTION_VERBS = {
    'build', 'test', 'improve', 'design', 'develop', 'work', 'contribute', 'lead',
    'embrace', 'implement', 'troubleshoot', 'debug', 'find', 'take', 'introduce',
    'manage', 'support', 'prepare', 'maintain', 'coordinate', 'assist', 'deliver',
    'create', 'optimize', 'analyse', 'analyze', 'monitor', 'ensure', 'handle',
    'process', 'perform', 'drive', 'execute', 'collaborate', 'communicate',
}

CONNECTOR_WORDS = {
    'and', 'or', 'that', 'to', 'with', 'using', 'for', 'from', 'into', 'through',
    'across', 'between', 'within', 'such', 'as', 'by', 'of', 'on', 'in', 'at',
}

DYNAMIC_STOP_WORDS.update(GENERAL_QUALITY_NOISE)
WEAK_START_WORDS.update(GENERAL_QUALITY_NOISE)
WEAK_END_WORDS.update(GENERAL_QUALITY_NOISE)
GENERIC_SINGLE_WORD_NOISE.update(GENERAL_QUALITY_NOISE)

REGEX_TERMS: list[tuple[str, str, str]] = [
    # Software / data / cloud
    ('Full-stack Development', r'\bfull[\s-]?stack(?:\s+development|\s+developer)?\b', 'hard'),
    ('Front-end Development', r'\bfront[\s-]?end(?:\s+development|\s+developer)?\b', 'hard'),
    ('Back-end Development', r'\bback[\s-]?end(?:\s+development|\s+developer)?\b', 'hard'),
    ('React Native', r'\breact\s+native\b', 'hard'),
    ('Laravel', r'\blaravel\b', 'hard'),
    ('HTML', r'\bhtml5?\b', 'hard'),
    ('CSS', r'\bcss3?\b', 'hard'),
    ('jQuery', r'\bjquery\b', 'hard'),
    ('AJAX', r'\bajax\b', 'hard'),
    ('SVN', r'\bsvn\b|\bsubversion\b', 'hard'),
    ('DigitalOcean', r'\bdigital\s*ocean\b|\bdigitalocean\b', 'hard'),
    ('Apache', r'\bapache\b', 'hard'),
    ('nginx', r'\bnginx\b', 'hard'),
    ('Databases', r'\bdatabases?\b|\bdbms\b', 'hard'),
    ('Code Versioning', r'\bcode\s+versioning(?:\s+tools?)?\b|\bversion\s+control\b', 'hard'),
    ('Web Server Experience', r'\bweb\s+server(?:\s+experience)?\b', 'hard'),
    ('Cloud Services', r'\bcloud\s+services?\b', 'hard'),
    ('Mobile Frameworks', r'\bmobile\s+frameworks?\b', 'hard'),
    ('Software Development Lifecycle', r'\bsoftware\s+development\s+life\s*cycles?\b|\bsdlc\b', 'hard'),
    ('UI/UX', r'\bui\s*/\s*ux\b|\buser\s+interface\s*/\s*user\s+experience\b', 'hard'),
    ('System Testing', r'\bsystem\s+testing\b', 'hard'),
    ('Automated Testing', r'\bautomated\s+testing\b|\btest\s+automation\b', 'hard'),
    ('Automation', r'\bautomation\b', 'hard'),
    ('Artificial Intelligence', r'\bartificial\s+intelligence\b|\bai\b', 'hard'),
    ('JavaScript Frameworks', r'\bjavascript\s+frameworks?\b|\bjs\s+frameworks?\b|\bjavascript\s*/\s*php\s+web\s+and\s+mobile\s+frameworks?\b', 'hard'),
    ('PHP Frameworks', r'\bphp\s+frameworks?\b|\bjavascript\s*/\s*php\s+web\s+and\s+mobile\s+frameworks?\b', 'hard'),
    ('Web Frameworks', r'\bweb\s+frameworks?\b|\bweb\s+and\s+mobile\s+frameworks?\b|\bjavascript\s*/\s*php\s+web\s+and\s+mobile\s+frameworks?\b', 'hard'),
    ('Computer Science', r'\bcomputer\s+science\b', 'education'),
    ('Adobe Creative Suite', r'\badobe\s+creative\s+suite\b', 'hard'),
    ('Adobe Photoshop', r'\badobe\s+photoshop\b|\bphotoshop\b', 'hard'),
    ('Adobe Illustrator', r'\badobe\s+illustrator\b|\billustrator\b', 'hard'),
    ('Figma', r'\bfigma\b', 'hard'),
    ('SEO', r'\bseo\b|\bsearch\s+engine\s+optimization\b', 'hard'),
    ('CMS', r'\bcms\b|\bcontent\s+management\s+systems?\b', 'hard'),
    ('Responsive Design', r'\bresponsive\s+design(?:\s+principles)?\b', 'hard'),
    ('Web Developer', r'\bweb\s+developer\b', 'role'),

    # Learning / content / EdTech
    ('Content Design', r'\bcontent\s+design\b', 'hard'),
    ('Learning Design', r'\blearning\s+design\b', 'hard'),
    ('Instructional Design', r'\binstructional\s+design\b', 'hard'),
    ('E-learning', r'\be[\s-]?learning\b|\bonline\s+learning\b|\bdigital\s+learning\b', 'hard'),
    ('LMS', r'\blms\b|\blearning\s+management\s+systems?\b', 'hard'),
    ('Authoring Tools', r'\bauthoring\s+tools?\b|\be[\s-]?learning\s+authoring\s+tools?\b', 'hard'),
    ('PowerPoint', r'\bpower\s*point\b|\bpowerpoint\b|\bmicrosoft\s+powerpoint\b', 'hard'),
    ('Canva', r'\bcanva\b', 'hard'),
    ('Articulate', r'\barticulate\b', 'hard'),
    ('Rise', r'\brise\b', 'hard'),
    ('H5P', r'\bh5p\b', 'hard'),
    ('Learning Experience', r'\blearning\s+experiences?\b', 'hard'),
    ('Education Technology', r'\beducation\s+technology\b|\bedtech\b', 'hard'),
    ('Digital Training', r'\bdigital\s+training\b', 'hard'),
    ('Educational Content', r'\beducational\s+content\b', 'hard'),
    ('Training Content', r'\btraining\s+content\b|\btraining\s+materials\b|\blearning\s+materials\b', 'hard'),
    ('Workshops', r'\bworkshops?\b', 'hard'),
    ('UX', r'\bux\b|\buser\s+experience\b', 'hard'),

    # Hospitality / service
    ('Hospitality', r'\bhospitality\b', 'hard'),
    ('Restaurant Service', r'\brestaurant\s+service\b|\brestaurant\s+environment\b|\brestaurant\s+or\s+bar\b|\bfull-service\b|\blifestyle\s+dining\b|\bdining\s+setting\b', 'hard'),
    ('Bar Service', r'\bbar\s+service\b|\bbar\s+environment\b', 'hard'),
    ('Food and Beverage', r'\bfood\s+(?:and|&)\s+beverages?\b|\bf\s*&\s*b\b|\bf\s+and\s+b\b', 'hard'),
    ('Italian Cuisine', r'\bitalian\s+cuisine\b|\bitalian\s+service\s+traditions?\b|\bitalian\s+service\b', 'hard'),
    ('Guest Experience', r'\bguest\s+experiences?\b|\bmemorable\s+guest\s+experiences?\b|\bcustomer\s+service\b|\bguest\s+service\b', 'hard'),
    ('Cleanliness and Hygiene', r'\bcleanliness\b|\bhygiene\b|\bhygiene\s+standards\b', 'hard'),
    ('Rotating Shifts', r'\brotating\s+shifts\b|\bweekends?\b|\bpublic\s+holidays\b|\bholiday\s+shifts\b', 'hard'),
    ('Fine Dining', r'\bfine\s+dining\b', 'hard'),
    ('POS Systems', r'\bpos\b|\bpoint\s+of\s+sale\b', 'hard'),
    ('Management Support', r'\bassist\s+line\s+managers?\b|\bassisting\s+line\s+managers?\b|\bsupport\s+line\s+managers?\b|\bsupporting\s+line\s+managers?\b|\bhelp\s+managers?\b|\bhandle\s+task\s+assignment\b|\btask\s+assignment\b|\bassign\s+tasks?\b', 'soft'),
    ('WSQ Certificate', r'\bwsq\s+(?:food\s+safety\s+)?certificat(?:e|ion)\b|\bwsq\b|\bfood\s+safety\s+certificat(?:e|ion)\b', 'hard'),

    # Generic business / operations terms
    ('Inventory Management', r'\binventory\s+management\b', 'hard'),
    ('Supply Chain', r'\bsupply\s+chain\b', 'hard'),
    ('Customer Service', r'\bcustomer\s+service\b', 'hard'),
    ('Patient Care', r'\bpatient\s+care\b', 'hard'),
    ('Financial Reporting', r'\bfinancial\s+reporting\b', 'hard'),
    ('Project Coordination', r'\bproject\s+coordination\b', 'hard'),

    # Clean soft skills. Keep these canonical and avoid sentence fragments.
    ('Communication', r'\bcommunication\s+skills?\b|\bcommunicat(?:e|es|ed|ing|ion)\b', 'soft'),
    ('Interpersonal Skills', r'\binterpersonal\s+skills?\b|\binterpersonal\b', 'soft'),
    ('Teamwork', r'\bteam\s+player\b|\bteamwork\b|\bteam\s+collaboration\b|\bcollaborat(?:e|es|ed|ing|ively|ion)\b|\bsupports?\s+colleagues\b', 'soft'),
    ('Collaboration', r'\bwork\s+collaboratively\b|\bcollaboration\b|\bcollaborative\b|\bcollaborate\b', 'soft'),
    ('Time Management', r'\bmeet\s+deadlines\b|\bdeadlines?\b|\btime\s+management\b', 'soft'),
    ('Troubleshooting', r'\btroubleshoot(?:ing)?\b|\bdebug(?:ging)?\b', 'hard'),
    ('Independent Problem Solving', r'\bresolve\s+issues\s+independently\b|\bdebug\s+and\s+resolve\s+issues\b', 'soft'),
    ('Problem Solving', r'\bsolve\s+(?:difficult\s+|technical\s+|business\s+)?problems?\b|\bproblem[\s-]?solving\b|\btechnical\s+challenges\b|\bcreative\s+solutions\b', 'soft'),
    ('Research', r'\bresearch\b', 'soft'),
    ('Initiative / Proactive', r'\btake\s+initiative\b|\btakes\s+initiative\b|\btaking\s+initiative\b|\binitiative\b|\bself[\s-]?starter\b|\bproactive\b|\bintroduce\s+new\s+(?:tools|frameworks|workflows)\b', 'soft'),
    ('Creativity', r'\bcreative\s+solutions\b|\bcreative\b|\bcreativity\b|\binnovative\b|\binnovation\b', 'soft'),
    ('Continuous Improvement', r'\bcontinuous\s+improvement\b|\btechnical\s+improvements?\b|\benhance\s+productivity\b|\bimprove\s+productivity\b|\bbest\s+practices\b', 'soft'),
    ('Leadership', r'\blead\s+technical\s+improvements?\b|\blead\s+improvements?\b|\btechnical\s+leadership\b|\bleadership\b|\bleading\b', 'soft'),
    ('Collaboration', r'\bcontribute\s+to\s+(?:architecture\s+|technical\s+)?discussions\b|\barchitecture\s+discussions\b|\btechnical\s+discussions\b|\bcollaboration\b|\bcollaborative\b|\bcollaborate\b', 'soft'),
    ('Adaptability', r'\badaptable\b|\badaptability\b|\bfast-paced\b', 'soft'),
    ('Eager to Learn', r'\beager\s+to\s+learn\b|\bwillingness\s+to\s+learn\b|\bwilling\s+to\s+learn\b|\blearn\s+more\b', 'soft'),
    ('Enthusiasm', r'\benthusiastic\b|\benthusiasm\b|\bpassion\b|\bpassionate\b', 'soft'),
    ('Friendly Presence', r'\bfriendly\b|\bwarm\b|\bwelcoming\b|\bcheerful\b|\bpositive\s+attitude\b', 'soft'),
    ('Confident Presence', r'\bconfident\b|\bconfidence\b|\bconfident\s+presence\b', 'soft'),
    ('Detail Orientation', r'\bdetail[\s-]?oriented\b|\battention\s+to\s+detail\b|\bthoughtful\b|\bstructured\b|\bpresentation\b', 'soft'),
    ('Professional Presentation', r'\bwell[\s-]?groomed\b|\bpresentable\b|\bprofessional\s+appearance\b|\bprofessional\s+presentation\b', 'soft'),
    ('Takes Feedback Well', r'\btake\s+direction\b|\btakes\s+direction\b|\brespond\s+positively\s+to\s+feedback\b|\btake\s+feedback\b|\bopen\s+to\s+training\b', 'soft'),
    ('Stakeholder Management', r'\bstakeholder\s+management\b|\bstakeholders?\b', 'soft'),
]

# Extra clean, exact terms across industries. This improves recall without allowing
# raw sentence fragments to become ATS keywords.
REGEX_TERMS.extend([
    # Software / product / data
    ('Prisma ORM', r'\bprisma\s+orm\b|\bprisma\b', 'hard'),
    ('Clean Code', r'\bclean\s+code\b', 'hard'),
    ('Type Safety', r'\btype\s+safety\b|\btype-safe\b|\btype\s+safe\b', 'hard'),
    ('Testing', r'\btesting\b|\btest\b|\btests\b', 'hard'),
    ('Debugging', r'\bdebugging\b|\bdebug\b', 'hard'),
    ('Troubleshooting', r'\btroubleshooting\b|\btroubleshoot\b', 'hard'),
    ('Software Architecture', r'\bsoftware\s+architecture\b|\barchitecture\s+discussions?\b|\btechnical\s+architecture\b', 'hard'),
    ('Best Practices', r'\bbest\s+practices\b', 'hard'),
    ('AI Workflows', r'\bai\s+workflows?\b|\bllm\s+workflows?\b', 'hard'),
    ('Workflow Improvement', r'\bworkflow\s+improvements?\b|\bimprove\s+workflows?\b|\bworkflow\s+optimization\b', 'hard'),

    # Finance / accounting / ERP
    ('Xero', r'\bxero\b', 'hard'),
    ('Sage', r'\bsage\b', 'hard'),
    ('SAP', r'\bsap\b', 'hard'),
    ('NetSuite', r'\bnetsuite\b|\bnet\s*suite\b', 'hard'),
    ('Oracle', r'\boracle\b', 'hard'),
    ('Financial Analysis', r'\bfinancial\s+analysis\b', 'hard'),
    ('Invoice Processing', r'\binvoice\s+processing\b|\bprocessing\s+invoices\b', 'hard'),

    # HR / admin / operations
    ('Candidate Screening', r'\bcandidate\s+screening\b|\bscreen\s+candidates\b', 'hard'),
    ('Employee Relations', r'\bemployee\s+relations\b', 'hard'),
    ('Microsoft Office', r'\bmicrosoft\s+office\b|\bms\s+office\b', 'hard'),
    ('Google Workspace', r'\bgoogle\s+workspace\b|\bg\s*suite\b', 'hard'),
    ('Process Improvement', r'\bprocess\s+improvements?\b|\bcontinuous\s+improvement\b', 'hard'),
    ('Vendor Management', r'\bvendor\s+management\b|\bsupplier\s+management\b', 'hard'),

    # Healthcare / education / service
    ('Clinical Documentation', r'\bclinical\s+documentation\b|\bclinical\s+notes\b', 'hard'),
    ('Lesson Planning', r'\blesson\s+planning\b|\blesson\s+plans\b', 'hard'),
    ('Customer Experience', r'\bcustomer\s+experience\b', 'hard'),
])

HARD_CUE_WORDS = {
    'api', 'application', 'applications', 'architecture', 'automation', 'automated',
    'bar', 'business intelligence', 'campaign', 'care', 'cloud', 'code', 'coding',
    'content', 'cuisine', 'customer', 'data', 'database', 'databases', 'deployment',
    'design', 'development', 'digital', 'engineering', 'framework', 'frameworks',
    'frontend', 'front-end', 'backend', 'back-end', 'full-stack', 'hospitality',
    'inventory', 'learning', 'lifecycle', 'marketing', 'mobile', 'nursing', 'patient',
    'payment', 'programming', 'reporting', 'restaurant', 'sales', 'server', 'software',
    'system', 'testing', 'training', 'ux', 'ui', 'versioning', 'web', 'workshop', 'workshops',
}

EDUCATION_CUE_WORDS = {
    'bachelor', 'bachelors', 'master', 'degree', 'diploma', 'certificate', 'certification',
    'computer science', 'education', 'psychology', 'communications', 'university', 'college',
}

# Convert noisy YAKE fragments into clean keywords or remove them. These are deterministic
# normalization rules, not AI.
CANONICAL_BY_PATTERN: list[tuple[str, list[tuple[str, str]]]] = [
    (r'excellent\s+interpersonal\s+and\s+communication|interpersonal\s+and\s+communication\s+skills?', [('Interpersonal Skills', 'soft'), ('Communication', 'soft')]),
    (r'communication\s+skills?', [('Communication', 'soft')]),
    (r'team\s+player\s+who\s+contributes|team\s+player', [('Teamwork', 'soft')]),
    (r'meet\s+deadlines|deadlines?', [('Time Management', 'soft')]),
    (r'resolve\s+issues\s+independently|debug\s+and\s+resolve\s+issues', [('Independent Problem Solving', 'soft')]),
    (r'learning\s+design', [('Learning Design', 'hard')]),
    (r'instructional\s+design|design\s+instructional', [('Instructional Design', 'hard')]),
    (r'content\s+design', [('Content Design', 'hard')]),
    (r'engaging\s+learning\s+flows|learning\s+flows|clear\s+engaging\s+learning|engaging\s+learning', [('Learning Experience', 'hard')]),
    (r'software\s+development\s+lifecycles?|sdlc', [('Software Development Lifecycle', 'hard')]),
    (r'ui\s*/?\s*ux|user\s+interface|user\s+experience', [('UI/UX', 'hard')]),
    (r'code\s+versioning', [('Code Versioning', 'hard')]),
    (r'databases?\s+and\s+code\s+versioning', [('Databases', 'hard'), ('Code Versioning', 'hard')]),
    (r'php\s+web\s+and\s+mobile|web\s+and\s+mobile\s+frameworks?', [('PHP Frameworks', 'hard'), ('Web Frameworks', 'hard'), ('Mobile Frameworks', 'hard')]),
    (r'research\s+to\s+solve|performing\s+relevant\s+research|relevant\s+research', [('Research', 'soft')]),
    (r'hospitality\s+with\s+a\s+genuine|passion\s+for\s+hospitality', [('Hospitality', 'hard'), ('Enthusiasm', 'soft')]),
    (r'friendly\s+and\s+confident\s+presence', [('Friendly Presence', 'soft'), ('Confident Presence', 'soft')]),
    (r'cuisine\s+and\s+service\s+traditions', [('Italian Cuisine', 'hard')]),
    (r'e[ -]?learning\s+authoring', [('Authoring Tools', 'hard')]),
    (r'adobe\s+creative\s+suite', [('Adobe Creative Suite', 'hard')]),
    (r'adobe\s+photoshop|photoshop', [('Adobe Photoshop', 'hard')]),
    (r'adobe\s+illustrator|illustrator', [('Adobe Illustrator', 'hard')]),
    (r'content\s+management\s+systems?|\bcms\b', [('CMS', 'hard')]),
    (r'responsive\s+design', [('Responsive Design', 'hard')]),
    (r'web\s+technologies?\s+html', [('HTML', 'hard')]),
    (r'training\s+workshops?', [('Workshops', 'hard')]),
    (r'restaurant\s+environment|restaurant\s+or\s+bar', [('Restaurant Service', 'hard')]),
    (r'bar\s+environment', [('Bar Service', 'hard')]),
    (r'fast\s*[- ]\s*paced\s+restaurant|fast\s*[- ]\s*paced', [('Adaptability', 'soft')]),
]

PRIORITY_BY_SOURCE = {
    'catalog': 0,
    'regex': 1,
    'list_phrase': 2,
    'canonicalized': 2,
    'yake': 4,
    'fallback_ngram': 5,
}

MAX_DYNAMIC_HARD = 20
MAX_DYNAMIC_SOFT = 8
MAX_DYNAMIC_INDUSTRY = 8


def normalize_for_matching(text: str) -> str:
    text = (text or '').lower()
    text = text.replace('&', ' and ')
    text = re.sub(r'[\u2010-\u2015]', '-', text)
    text = re.sub(r'[^a-z0-9+#./-]+', ' ', text)
    return re.sub(r'\s+', ' ', text).strip()


def contains_phrase(text: str, phrase: str) -> bool:
    normalized = normalize_for_matching(text).replace('/', ' ')
    phrase = normalize_for_matching(phrase).replace('/', ' ')
    if not phrase:
        return False
    return re.search(rf'(?<![a-z0-9]){re.escape(phrase)}(?![a-z0-9])', normalized) is not None


def unique_preserve_order(items: list[str]) -> list[str]:
    output: list[str] = []
    seen: set[str] = set()
    for item in items:
        clean = re.sub(r'\s+', ' ', item or '').strip(' .,;:()[]{}')
        key = normalize_for_matching(clean)
        if clean and key and key not in seen:
            output.append(clean)
            seen.add(key)
    return output


def title_preserve_acronyms(phrase: str) -> str:
    replacements = {
        'html': 'HTML', 'css': 'CSS', 'php': 'PHP', 'api': 'API', 'apis': 'APIs', 'ui': 'UI',
        'ux': 'UX', 'ui/ux': 'UI/UX', 'sdlc': 'SDLC', 'ai': 'AI', 'aws': 'AWS', 'svn': 'SVN',
        'git': 'Git', 'nginx': 'nginx', 'jquery': 'jQuery', 'ajax': 'AJAX', 'lms': 'LMS',
        'pos': 'POS', 'seo': 'SEO', 'cms': 'CMS', 'crm': 'CRM', 'hris': 'HRIS', 'erp': 'ERP', 'h5p': 'H5P',
        'moe': 'MOE', 'esl': 'ESL', 'eal': 'EAL', 'ccas': 'CCAs',
        'openai': 'OpenAI',
        'llm': 'LLM',
        'llms': 'LLMs',
        'graphql': 'GraphQL',
        'postgresql': 'PostgreSQL',
        'typescript': 'TypeScript',
        'javascript': 'JavaScript',
        'node.js': 'Node.js',
        'react.js': 'React.js',
        'wsq': 'WSQ',
    }
    words = re.split(r'(\s+|-|/)', phrase.strip())
    output: list[str] = []
    for word in words:
        key = word.lower()
        if key in replacements:
            output.append(replacements[key])
        elif word.isspace() or word in {'-', '/'}:
            output.append(word)
        else:
            output.append(word.capitalize())
    text = ''.join(output)
    text = text.replace('Front-End', 'Front-end').replace('Back-End', 'Back-end').replace('Full-Stack', 'Full-stack')
    return text


def clean_candidate_phrase(phrase: str) -> str:
    phrase = re.sub(r'https?://\S+', ' ', phrase or '')
    phrase = re.sub(r'\be\s*\.?\s*g\s*\.?|\bi\s*\.?\s*e\s*\.?', ' ', phrase or '', flags=re.IGNORECASE)
    phrase = re.sub(r'\([^)]{0,120}\)', ' ', phrase)
    phrase = re.sub(r'\([^)]*$', ' ', phrase)
    phrase = phrase.replace('&', ' and ')
    phrase = re.sub(r'[\u2010-\u2015]', '-', phrase)
    phrase = re.sub(r'[^A-Za-z0-9+#./\-\s]', ' ', phrase)
    phrase = re.sub(r'\s+', ' ', phrase).strip(' .,/;-:')
    return phrase


def canonicalize_phrase(phrase: str) -> list[tuple[str, str]]:
    normalized = normalize_for_matching(clean_candidate_phrase(phrase))
    if not normalized:
        return []
    canonical: list[tuple[str, str]] = []
    for pattern, replacements in CANONICAL_BY_PATTERN:
        if re.search(pattern, normalized):
            canonical.extend(replacements)
    return canonical


def is_untrusted_source(source: str) -> bool:
    return str(source or '').split('+')[0] in {'yake', 'fallback_ngram'}


def is_tool_like_name(phrase: str) -> bool:
    raw = clean_candidate_phrase(phrase)
    normalized = normalize_for_matching(raw)
    if not raw or not normalized:
        return False

    words = normalized.split()
    if not words:
        return False
    if words[0] in GENERAL_QUALITY_NOISE or words[0] in JD_ACTION_VERBS or words[0] in CONNECTOR_WORDS:
        return False
    if words[-1] in GENERAL_QUALITY_NOISE or words[-1] in JD_ACTION_VERBS or words[-1] in CONNECTOR_WORDS:
        return False

    # Acronyms and tool/library names are safe dynamic candidates: SAP, Xero,
    # Workday, Prisma ORM, H5P, C#, C++, GA4, etc.
    if re.fullmatch(r'[A-Z0-9+#.]{2,}(?:\s+[A-Z0-9+#.]{2,}){0,1}', raw):
        return True

    # Two-word tool phrases usually have a known product suffix/type.
    if re.fullmatch(r'[A-Z][A-Za-z0-9+#.]{1,}\s+(?:ORM|CRM|ERP|HRIS|API|CMS|SQL|BI|AI|ML|DB|Suite|Cloud|Studio|Workspace|Analytics|Office|Teams|Slack)', raw):
        return True

    # Single token tool names: Workday, NetSuite, Salesforce, Shopify, QuickBooks, Xero.
    if len(words) == 1 and re.fullmatch(r'[A-Z][A-Za-z0-9+#.]{1,}', raw):
        return True

    if any(char in raw for char in ['#', '+', '/']) and len(words) <= 2:
        return True

    # Dotted JS/library terms are valid only as one token, not glued phrases like
    # "React.js Node.js" or "Using React.js".
    if re.search(r'(?:\.js|js)$', normalized) and len(words) == 1:
        return True

    if re.search(r'\b(?:sql|orm|crm|erp|hris|api|cms|bi|ai|ml|cloud|suite|studio|analytics)\b', normalized):
        return len(words) <= 2 and not has_sentence_fragment_shape(phrase)

    return False


def has_sentence_fragment_shape(phrase: str) -> bool:
    normalized = normalize_for_matching(phrase)
    words = normalized.split()
    if not words:
        return True

    if len(words) >= 4:
        return True

    # Verb-led phrases are usually JD duties, not skill labels.
    if words[0] in JD_ACTION_VERBS:
        return True

    # Phrases containing grammar glue are usually fragments produced by YAKE.
    if any(word in CONNECTOR_WORDS for word in words[1:-1]):
        return True

    # Adjacent action verbs normally indicate a sentence fragment: design develop robust.
    if sum(1 for word in words if word in JD_ACTION_VERBS) >= 2:
        return True

    # Generic adjective/noun endings are not useful ATS keywords.
    if words[-1] in GENERAL_QUALITY_NOISE and not is_tool_like_name(phrase):
        return True

    # Single generic words are never useful dynamic skills.
    if len(words) == 1 and words[0] in GENERAL_QUALITY_NOISE:
        return True

    return False


def is_clean_noun_skill_phrase(phrase: str) -> bool:
    normalized = normalize_for_matching(phrase)
    words = normalized.split()
    if not words:
        return False

    if is_tool_like_name(phrase):
        return True

    # Accept concise noun phrases ending in a strong domain noun. This is generic
    # across industries: financial reporting, inventory management, patient care,
    # classroom management, project coordination, clinical documentation, etc.
    strong_domain_endings = {
        'analysis', 'analytics', 'reporting', 'management', 'administration',
        'documentation', 'coordination', 'planning', 'development', 'testing',
        'debugging', 'troubleshooting', 'architecture', 'design', 'research',
        'care', 'screening', 'onboarding', 'recruitment', 'accounting', 'bookkeeping',
        'forecasting', 'budgeting', 'procurement', 'logistics', 'compliance',
        'merchandising', 'copywriting', 'marketing', 'sales', 'support', 'service',
        'training', 'teaching', 'tutoring', 'safety', 'quality', 'auditing',
        'reconciliation', 'payroll', 'inventory', 'database', 'databases', 'api',
    }

    if 2 <= len(words) <= 3 and words[-1] in strong_domain_endings:
        if not has_sentence_fragment_shape(phrase):
            return True

    return False


def should_allow_untrusted_candidate(phrase: str, category: str | None = None) -> bool:
    if canonicalize_phrase(phrase):
        return True
    if is_tool_like_name(phrase):
        return True
    if category == 'hard' and is_clean_noun_skill_phrase(phrase):
        return True
    if category in {'industry', 'education'} and is_clean_noun_skill_phrase(phrase):
        return True
    return False


def is_noise_phrase(phrase: str) -> bool:
    clean = clean_candidate_phrase(phrase)
    normalized = normalize_for_matching(clean)
    if not clean or not normalized:
        return True
    if len(clean) < 2 or len(clean) > 68:
        return True
    if canonicalize_phrase(clean):
        return False
    if re.search(r'[a-z]\.\s+[A-Z]', clean):
        return True
    if any(re.search(pattern, normalized) for pattern in NOISE_PATTERNS):
        return True
    if ' or ' in f' {normalized} ':
        return True
    words = normalized.split()
    if len(words) > 4:
        return True
    if len(words) == 1 and (words[0] in DYNAMIC_STOP_WORDS or words[0] in GENERIC_SINGLE_WORD_NOISE):
        return True
    if words and (words[0] in WEAK_START_WORDS or words[-1] in WEAK_END_WORDS):
        return True
    if words and sum(1 for word in words if word in DYNAMIC_STOP_WORDS) / len(words) > 0.45:
        return True
    if re.fullmatch(r'\d+(?:\s+years?)?', normalized):
        return True
    if has_sentence_fragment_shape(clean) and not is_clean_noun_skill_phrase(clean):
        return True
    if is_tool_like_name(clean):
        return False
    return False


def classify_phrase(phrase: str) -> str | None:
    normalized = normalize_for_matching(phrase)
    words = normalized.split()
    if not words:
        return None

    if normalized in ROLE_KEYWORDS or (len(words) <= 3 and words[-1] in {'developer', 'engineer', 'designer', 'manager', 'analyst', 'specialist'}):
        return 'role'
    if len(words) == 1 and words[0] in GENERIC_SINGLE_WORD_NOISE:
        return None

    if any(cue in normalized for cue in EDUCATION_CUE_WORDS):
        return 'education'

    canonical = canonicalize_phrase(phrase)
    if canonical:
        categories = {category for _, category in canonical}
        if len(categories) == 1:
            return next(iter(categories))

    if is_tool_like_name(phrase):
        return 'hard'

    if has_sentence_fragment_shape(phrase) and not is_clean_noun_skill_phrase(phrase):
        return None

    if any(cue in normalized for cue in HARD_CUE_WORDS) and is_clean_noun_skill_phrase(phrase):
        return 'hard'

    raw = phrase.strip()
    if re.fullmatch(r'[A-Z][A-Za-z0-9+#.]{1,}(?:\s+[A-Z][A-Za-z0-9+#.]{1,}){0,2}', raw):
        if normalize_for_matching(raw) in ROLE_KEYWORDS:
            return 'role'
        return 'hard'
    if any(char in raw for char in ['/', '+', '#']) and len(words) <= 4:
        return 'hard'
    return None


def catalog_alias_index(skill_catalog: dict[str, dict[str, Any]]) -> dict[str, str]:
    index: dict[str, str] = {}
    for canonical, config in (skill_catalog or {}).items():
        index[normalize_for_matching(canonical)] = canonical
        for alias in config.get('aliases', []) or []:
            index[normalize_for_matching(str(alias))] = canonical
    return index


def catalog_category(canonical: str, skill_catalog: dict[str, dict[str, Any]]) -> str | None:
    config = (skill_catalog or {}).get(canonical)
    if not config:
        return None
    category = config.get('category')
    return str(category) if category else None


def candidate_priority(candidate: KeywordCandidate) -> tuple[int, int]:
    first_source = candidate.source.split('+')[0].split(',')[0]
    category_rank = {'hard': 0, 'soft': 1, 'industry': 2, 'education': 3}.get(candidate.category, 4)
    return (PRIORITY_BY_SOURCE.get(first_source, 9), category_rank)


def make_candidate(name: str, category: str, keywords: list[str] | tuple[str, ...], source: str, score: float = 1.0) -> KeywordCandidate:
    clean_keywords = unique_preserve_order([clean_candidate_phrase(keyword) for keyword in keywords if keyword])
    if not clean_keywords:
        clean_keywords = [name]
    return KeywordCandidate(name=name, category=category, job_keywords=tuple(clean_keywords), source=source, score=score)


def make_candidates_from_phrase(
    phrase: str,
    source: str,
    skill_catalog: dict[str, dict[str, Any]],
    alias_index: dict[str, str],
) -> list[KeywordCandidate]:
    clean = clean_candidate_phrase(phrase)
    if not clean:
        return []

    canonicalized = canonicalize_phrase(clean)
    if canonicalized:
        return [make_candidate(name, category, [name], 'canonicalized') for name, category in canonicalized]

    if is_noise_phrase(clean):
        return []

    normalized = normalize_for_matching(clean)
    catalog_name = alias_index.get(normalized)
    if catalog_name:
        category = catalog_category(catalog_name, skill_catalog) or classify_phrase(catalog_name) or 'hard'
        if category == 'role':
            return []
        return [make_candidate(catalog_name, category, [clean], f'{source}+catalog')]

    category = classify_phrase(clean)
    if not category or category in {'soft', 'role'}:
        # Soft skills and role titles should come from clean regex/canonical rules or the explicit job-title check, not raw YAKE fragments.
        return []

    # YAKE/fallback are useful, but too noisy to be trusted unless phrase shape is strong.
    if is_untrusted_source(source) and not should_allow_untrusted_candidate(clean, category):
        return []

    name = title_preserve_acronyms(normalized)
    if normalized in {'ui ux', 'ui/ux'}:
        name = 'UI/UX'
    return [make_candidate(name, category, [clean], source)]


def split_example_terms(text: str) -> list[str]:
    terms: list[str] = []
    # Parenthetical examples: (e.g. Git, SVN), (e.g. Apache, nginx)
    for match in re.finditer(r'\((?:e\.g\.|eg|such as|including)?\s*([^)]{2,160})\)', text or '', flags=re.IGNORECASE):
        content = match.group(1)
        for part in re.split(r',|/|\bor\b|\band\b', content, flags=re.IGNORECASE):
            clean = clean_candidate_phrase(part)
            if clean and not is_noise_phrase(clean):
                terms.append(clean)

    # Common JD list phrases. This catches unknown tools without a catalog entry.
    list_cues = [
        r'(?:experience in|experience with|knowledge of|understanding of|hands-on|hands on|skills in|proficient in|familiar with)\s+([^.;\n]{2,200})',
        r'(?:tools such as|tools like|frameworks such as|frameworks like|services such as|services like)\s+([^.;\n]{2,200})',
    ]
    for pattern in list_cues:
        for match in re.finditer(pattern, text or '', flags=re.IGNORECASE):
            content = match.group(1)
            for part in re.split(r',|/|\bor\b|\band\b', content, flags=re.IGNORECASE):
                clean = clean_candidate_phrase(part)
                if clean and not is_noise_phrase(clean):
                    terms.append(clean)

    return unique_preserve_order(terms)


def extract_regex_candidates(text: str) -> list[KeywordCandidate]:
    candidates: list[KeywordCandidate] = []
    for name, pattern, category in REGEX_TERMS:
        if re.search(pattern, text or '', flags=re.IGNORECASE):
            if category == 'role':
                continue
            keyword = name
            candidates.append(make_candidate(name, category, [keyword], 'regex'))
    return candidates


def extract_yake_phrases(text: str, max_keywords: int = 80) -> list[str]:
    if not text or yake is None:
        return []
    try:
        extractor = yake.KeywordExtractor(lan='en', n=4, dedupLim=0.88, windowsSize=2, top=max_keywords)
        raw_keywords = extractor.extract_keywords(text)
    except Exception:
        return []

    phrases: list[str] = []
    for phrase, _score in raw_keywords:
        clean = clean_candidate_phrase(str(phrase))
        if clean and (canonicalize_phrase(clean) or not is_noise_phrase(clean)):
            phrases.append(clean)
    return unique_preserve_order(phrases)


def extract_fallback_phrases(text: str, max_phrases: int = 50) -> list[str]:
    normalized = normalize_for_matching(text)
    tokens = [token for token in normalized.split() if token]
    phrases: list[str] = []
    for n in (4, 3, 2):
        for index in range(0, max(0, len(tokens) - n + 1)):
            phrase = ' '.join(tokens[index:index + n])
            if canonicalize_phrase(phrase) or (not is_noise_phrase(phrase) and classify_phrase(phrase)):
                phrases.append(phrase)
            if len(phrases) >= max_phrases:
                return unique_preserve_order(phrases)
    return unique_preserve_order(phrases)


def dedupe_candidates(candidates: list[KeywordCandidate]) -> list[KeywordCandidate]:
    # Sort so clean sources win over YAKE fragments.
    sorted_candidates = sorted(candidates, key=candidate_priority)
    merged: dict[tuple[str, str], KeywordCandidate] = {}
    order: list[tuple[str, str]] = []
    for candidate in sorted_candidates:
        key = (candidate.category, normalize_for_matching(candidate.name))
        if key not in merged:
            merged[key] = candidate
            order.append(key)
            continue
        existing = merged[key]
        keywords = tuple(unique_preserve_order(list(existing.job_keywords) + list(candidate.job_keywords)))
        source = existing.source if candidate.source in existing.source else f'{existing.source},{candidate.source}'
        merged[key] = KeywordCandidate(
            name=existing.name,
            category=existing.category,
            job_keywords=keywords,
            source=source,
            score=min(existing.score, candidate.score),
            meta={**existing.meta, **candidate.meta},
        )
    return [merged[key] for key in order]


def remove_overlapping_fragments(candidates: list[KeywordCandidate]) -> list[KeywordCandidate]:
    candidates = dedupe_candidates(candidates)
    clean_candidates: list[KeywordCandidate] = []
    normalized_names = [normalize_for_matching(candidate.name) for candidate in candidates]

    for index, candidate in enumerate(candidates):
        name_norm = normalized_names[index]
        words = name_norm.split()

        if is_untrusted_source(candidate.source) and not should_allow_untrusted_candidate(candidate.name, candidate.category):
            continue

        # Drop long dynamic phrases when a cleaner shorter keyword is already present.
        if len(words) >= 3 and candidate.source.startswith(('yake', 'fallback_ngram')):
            contains_cleaner = any(
                other != name_norm and other and other in name_norm and len(other.split()) <= 2
                for other in normalized_names
            )
            if contains_cleaner:
                continue

        if candidate.category == 'soft' and len(words) > 3:
            continue
        if candidate.category == 'role':
            continue
        if name_norm in {
            'adobe creative', 'creative suite', 'web technologies', 'web technology',
            'web', 'developer', 'possess', 'proficient', 'design tools such',
            'design tools', 'content management', 'management systems',
        }:
            continue
        if name_norm in {'content management systems'} and any(other == 'cms' for other in normalized_names):
            continue
        if name_norm == 'cms' and any(other == 'content management systems' for other in normalized_names):
            clean_candidates.append(candidate)
            continue
        clean_candidates.append(candidate)
    return clean_candidates


def trim_by_category(candidates: list[KeywordCandidate]) -> list[KeywordCandidate]:
    grouped: dict[str, list[KeywordCandidate]] = {'hard': [], 'soft': [], 'industry': [], 'education': []}
    for candidate in candidates:
        category = candidate.category if candidate.category in grouped else 'industry'
        grouped[category].append(candidate)

    limits = {
        'hard': MAX_DYNAMIC_HARD,
        'soft': MAX_DYNAMIC_SOFT,
        'industry': MAX_DYNAMIC_INDUSTRY,
        'education': 6,
    }
    trimmed: list[KeywordCandidate] = []
    for category in ['hard', 'soft', 'industry', 'education']:
        trimmed.extend(grouped[category][:limits[category]])
    return trimmed


def dedupe_requirement_dicts(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    output: list[dict[str, Any]] = []
    seen: set[str] = set()
    for item in items:
        name = str(item.get('name', '')).strip()
        key = normalize_for_matching(name)
        if not name or key in seen:
            continue
        output.append(item)
        seen.add(key)
    return output


def extraction_confidence(candidates: list[KeywordCandidate]) -> str:
    if not candidates:
        return 'low'
    regex_count = sum(1 for candidate in candidates if 'regex' in candidate.source or 'catalog' in candidate.source)
    if regex_count >= 6:
        return 'high'
    if regex_count >= 3 or len(candidates) >= 8:
        return 'medium'
    return 'low'


def extract_dynamic_keyword_requirements(job_description: str, skill_catalog: dict[str, dict[str, Any]] | None = None) -> dict[str, list[dict[str, Any]]]:
    """Extract clean ATS keyword requirements from a job description.

    Pipeline:
    regex/list/catalog -> YAKE candidate phrases -> cleaning/canonicalization ->
    classification -> overlap removal -> category limits.

    Gemini/AI is not used here. This keeps the ATS score deterministic and explainable.
    """
    skill_catalog = skill_catalog or {}
    alias_index = catalog_alias_index(skill_catalog)

    candidates: list[KeywordCandidate] = []
    candidates.extend(extract_regex_candidates(job_description))

    for phrase in split_example_terms(job_description):
        candidates.extend(make_candidates_from_phrase(phrase, 'list_phrase', skill_catalog, alias_index))

    yake_phrases = extract_yake_phrases(job_description)
    if not yake_phrases and yake is None:
        yake_phrases = extract_fallback_phrases(job_description)

    for phrase in yake_phrases:
        candidates.extend(make_candidates_from_phrase(phrase, 'yake' if yake is not None else 'fallback_ngram', skill_catalog, alias_index))

    cleaned = trim_by_category(remove_overlapping_fragments(candidates))
    confidence = extraction_confidence(cleaned)

    grouped: dict[str, list[dict[str, Any]]] = {'hard': [], 'soft': [], 'industry': [], 'education': []}
    for candidate in cleaned:
        if candidate.category == 'role':
            continue
        target_category = candidate.category if candidate.category in grouped else 'industry'
        item = {
            'name': candidate.name,
            'category': target_category,
            'job_keywords': list(candidate.job_keywords),
            'source': candidate.source,
            'keyword_extraction_confidence': confidence,
        }
        grouped[target_category].append(item)

    # Broad role/phrase terms can support industry alignment, but keep the user-facing
    # hard-skill list cleaner by avoiding duplicate fragment phrases.
    for item in list(grouped['hard']):
        name_norm = normalize_for_matching(str(item.get('name', '')))
        if any(term in name_norm for term in ['full-stack', 'development lifecycle', 'web server experience', 'cloud services', 'restaurant service', 'learning experience']):
            grouped['industry'].append({**item, 'category': 'industry'})

    for key in grouped:
        grouped[key] = dedupe_requirement_dicts(grouped[key])
    return grouped

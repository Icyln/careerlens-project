from __future__ import annotations

import re
from datetime import datetime
from typing import Any

from .keyword_extractor import extract_dynamic_keyword_requirements

MONTHS = {
    'jan': 1, 'january': 1,
    'feb': 2, 'february': 2,
    'mar': 3, 'march': 3,
    'apr': 4, 'april': 4,
    'may': 5,
    'jun': 6, 'june': 6,
    'jul': 7, 'july': 7,
    'aug': 8, 'august': 8,
    'sep': 9, 'sept': 9, 'september': 9,
    'oct': 10, 'october': 10,
    'nov': 11, 'november': 11,
    'dec': 12, 'december': 12,
}

STANDARD_HEADING_GROUPS: dict[str, list[str]] = {
    'summary': ['summary', 'professional summary', 'profile', 'about me', 'career objective', 'objective'],
    'skills': ['skills', 'skill', 'technical skills', 'core competencies', 'competencies', 'technologies', 'technology stack', 'tools'],
    'experience': ['experience', 'experiences', 'work experience', 'professional experience', 'employment history', 'career history', 'work history'],
    'education': ['education', 'educational background', 'academic background', 'qualifications', 'academic qualifications'],
    'projects': ['projects', 'portfolio', 'selected projects'],
    'certifications': ['certifications', 'certificates', 'licenses'],
    'contact': ['contact', 'contact information', 'personal information'],
}

DEGREE_TERMS = [
    'bachelor', 'bachelor of', 'master', 'phd', 'doctorate', 'associate', 'diploma',
    'b.sc', 'bsc', 'ba', 'b.a', 'm.sc', 'msc', 'mba', 'ma', 'm.a', 'bs', 'ms',
]

CERTIFICATION_TERMS = [
    'certificate', 'certification', 'certified', 'license', 'licence', 'program completion',
    'completion of the program', 'diploma', 'training certificate',
]

INSTITUTION_TERMS = ['university', 'college', 'institute', 'school', 'academy', 'polytechnic']
COMPANY_SUFFIXES = [
    'inc', 'llc', 'ltd', 'limited', 'corp', 'corporation', 'company', 'co.', 'plc', 'group',
    'solutions', 'technologies', 'systems', 'hotel', 'restaurant', 'resort', 'agency', 'bank',
]

LOCATION_HINTS = [
    'remote', 'onsite', 'hybrid', 'yangon', 'mandalay', 'naypyidaw', 'myanmar', 'taunggyi',
    'singapore', 'bangkok', 'thailand', 'india', 'usa', 'united states', 'uk', 'united kingdom', 'uae',
    'united arab emirates', 'abu dhabi', 'dubai', 'sharjah', 'canada', 'australia', 'japan',
    'korea', 'malaysia', 'vietnam', 'philippines', 'germany', 'berlin', 'london', 'leeds', 'new york',
]

LOCATION_ADDRESS_TERMS = [
    'street', 'st.', 'st ', 'road', 'rd.', 'avenue', 'ave', 'lane', 'city', 'state', 'province',
    'township', 'district', 'village', 'building', 'tower', 'flat', 'apartment', 'apt',
]

NON_LOCATION_RESUME_CONTEXT_TERMS = [
    # Technology / product / project language
    'api', 'apis', 'rest api', 'restful api', 'frontend', 'frontends', 'backend',
    'react', 'node', 'node.js', 'typescript', 'javascript', 'database', 'databases',
    'application', 'applications', 'software', 'website', 'websites', 'user experience',
    'user experiences', 'accessible', 'integration', 'integrations', 'architecture',
    'debug', 'debugging', 'troubleshoot', 'testing',

    # Generic resume/profile sentence language
    'experience with', 'skilled in', 'proficient in', 'focused on', 'specializing in',
    'responsible for', 'worked with', 'designed', 'developed', 'built', 'created',
    'implemented', 'improved', 'maintained', 'supported', 'delivered', 'managed',

    # Business / general non-location wording
    'customers', 'clients', 'users', 'projects', 'workflows', 'processes',
    'operations', 'productivity', 'performance', 'requirements',
]

RESUME_ACTION_VERBS = [
    'welcomed', 'hosted', 'provided', 'assisted', 'delivered', 'maintained', 'managed',
    'handled', 'worked', 'received', 'created', 'developed', 'designed', 'implemented',
    'coordinated', 'organized', 'supported', 'processed', 'ensuring', 'committed', 'skilled',
]

PHONE_REGEX = re.compile(r'(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{3,4}')
EMAIL_REGEX = re.compile(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}')
URL_REGEX = re.compile(r'https?://\S+|(?:linkedin\.com|github\.com|portfolio\.|behance\.net)/\S+', re.IGNORECASE)


# Deterministic equivalences used by the strict ATS matcher. These are not AI synonyms;
# they are common abbreviations and official variants that ATS/recruiter searches often use.
CONTROLLED_EQUIVALENCES: dict[str, list[str]] = {
    'lms': ['lms', 'learning management system', 'learning management systems'],
    'LLM APIs': ['llm', 'Llm'],
    'OpenAI': ['Openai'],
    'learning management system': ['learning management system', 'learning management systems', 'lms'],
    'learning management systems': ['learning management systems', 'learning management system', 'lms'],
    'ppt': ['ppt', 'powerpoint', 'power point', 'microsoft powerpoint'],
    'powerpoint': ['powerpoint', 'power point', 'microsoft powerpoint', 'ppt'],
    'power point': ['power point', 'powerpoint', 'microsoft powerpoint', 'ppt'],
    'food and beverage': ['food and beverage', 'food & beverage', 'f&b', 'f and b', 'food beverages', 'food and beverages'],
    'food beverages': ['food beverages', 'food and beverage', 'food & beverage', 'f&b', 'f and b', 'food and beverages'],
    'f and b': ['f and b', 'f&b', 'food and beverage', 'food & beverage'],
    'f&b': ['f&b', 'f and b', 'food and beverage', 'food & beverage'],
    'pos': ['pos', 'pos system', 'pos systems', 'point of sale'],
    'point of sale': ['point of sale', 'pos', 'pos system', 'pos systems'],
    'ui/ux': ['ui/ux', 'ui ux', 'user interface', 'user experience', 'user interface user experience'],
    'ui ux': ['ui ux', 'ui/ux', 'user interface', 'user experience', 'user interface user experience'],
    'rest api': ['rest api', 'RESTful API', 'rest apis', 'restful api', 'restful apis', 'api integration', 'api integrations'],
    'rest apis': ['rest apis', 'rest api', 'restful api', 'restful apis', 'api integration', 'api integrations'],
    'restful api': ['restful api', 'restful apis', 'rest api', 'rest apis', 'api integration', 'api integrations'],
    'restful apis': ['restful apis', 'restful api', 'rest api', 'rest apis', 'api integration', 'api integrations'],
    'api integration': ['api integration', 'api integrations', 'rest api', 'restful api'],
    'api integrations': ['api integrations', 'api integration', 'rest api', 'restful api'],
    'sdlc': ['sdlc', 'software development lifecycle', 'software development life cycle', 'software development lifecycles'],
    'software development lifecycle': ['software development lifecycle', 'software development life cycle', 'software development lifecycles', 'sdlc'],
    'software development lifecycles': ['software development lifecycles', 'software development lifecycle', 'software development life cycle', 'sdlc'],
    'javascript': ['javascript', 'java script', 'js'],
    'java script': ['java script', 'javascript', 'js'],
    'js': ['js', 'javascript', 'java script'],
    'detail-oriented': ['detail-oriented', 'detail oriented', 'attention to detail', 'high attention to detail'],
    'detail oriented': ['detail oriented', 'detail-oriented', 'attention to detail', 'high attention to detail'],
    'detail orientation': ['detail orientation', 'detail-oriented', 'detail oriented', 'attention to detail', 'high attention to detail'],
    'communication': ['communication', 'communication skills', 'written communication', 'verbal communication', 'written and verbal', 'written & verbal'],
    'communication skills': ['communication skills', 'communication', 'written communication', 'verbal communication', 'written and verbal', 'written & verbal'],
    'it': ['it', 'information technology'],
    'information technology': ['information technology', 'it'],
    'cs': ['cs', 'computer science'],
    'computer science': ['computer science', 'cs'],
}

# Catalog terms are used only by the rule-based ATS engine. Gemini analysis is separate.
# Categories are intentionally broad because recruiter keyword search often mixes skills, tools,
# industry language, and practical requirements.
SKILL_CATALOG: dict[str, dict[str, Any]] = {
    # Technology / data / product
    'Python': {'category': 'hard', 'aliases': ['python']},
    'JavaScript': {'category': 'hard', 'aliases': ['javascript', 'java script', 'js']},
    'TypeScript': {'category': 'hard', 'aliases': ['typescript', 'type script', 'ts']},
    'Java': {'category': 'hard', 'aliases': ['java']},
    'C#': {'category': 'hard', 'aliases': ['c#', 'c sharp']},
    'C++': {'category': 'hard', 'aliases': ['c++', 'cpp']},
    'PHP': {'category': 'hard', 'aliases': ['php']},
    'SQL': {'category': 'hard', 'aliases': ['sql', 'structured query language']},
    'MySQL': {'category': 'hard', 'aliases': ['mysql']},
    'PostgreSQL': {'category': 'hard', 'aliases': ['postgresql', 'postgres']},
    'MongoDB': {'category': 'hard', 'aliases': ['mongodb', 'mongo db']},
    'Django': {'category': 'hard', 'aliases': ['django']},
    'Flask': {'category': 'hard', 'aliases': ['flask']},
    'FastAPI': {'category': 'hard', 'aliases': ['fastapi', 'fast api']},
    'React': {'category': 'hard', 'aliases': ['react', 'react.js', 'reactjs', 'React.js']},
    'Next.js': {'category': 'hard', 'aliases': ['next.js', 'nextjs']},
    'Vue': {'category': 'hard', 'aliases': ['vue', 'vue.js', 'vuejs']},
    'Angular': {'category': 'hard', 'aliases': ['angular']},
    'Node.js': {'category': 'hard', 'aliases': ['node.js', 'nodejs', 'node']},
    'REST API': {
        'category': 'hard',
        'aliases': [
            'rest api',
            'REST',
            'rest apis',
            'restful api',
            'restful apis',
            'api integration',
            'api integrations',
        ],
    },
    'GraphQL': {'category': 'hard', 'aliases': ['graphql']},
    'Docker': {'category': 'hard', 'aliases': ['docker']},
    'Kubernetes': {'category': 'hard', 'aliases': ['kubernetes', 'k8s']},
    'AWS': {'category': 'hard', 'aliases': ['aws', 'amazon web services']},
    'Azure': {'category': 'hard', 'aliases': ['azure', 'microsoft azure']},
    'Google Cloud': {'category': 'hard', 'aliases': ['google cloud', 'gcp']},
    'Linux': {'category': 'hard', 'aliases': ['linux']},
    'Git': {'category': 'hard', 'aliases': ['git']},
    'GitHub': {'category': 'hard', 'aliases': ['github']},
    'CI/CD': {'category': 'hard', 'aliases': ['ci/cd', 'continuous integration', 'continuous deployment']},
    'Figma': {'category': 'hard', 'aliases': ['figma']},
    'Jira': {'category': 'hard', 'aliases': ['jira']},
    'Project Management': {'category': 'hard', 'aliases': ['project management']},
    'Product Management': {'category': 'hard', 'aliases': ['product management']},
    'Data Analysis': {'category': 'hard', 'aliases': ['data analysis', 'data analytics']},
    'Machine Learning': {'category': 'hard', 'aliases': ['machine learning', 'ml']},
    'Power BI': {'category': 'hard', 'aliases': ['power bi', 'powerbi']},
    'Tableau': {'category': 'hard', 'aliases': ['tableau']},
    'Excel': {'category': 'hard', 'aliases': ['excel', 'microsoft excel']},
    'Salesforce': {'category': 'hard', 'aliases': ['salesforce']},
    'HubSpot': {'category': 'hard', 'aliases': ['hubspot']},
    'SEO': {'category': 'hard', 'aliases': ['seo', 'search engine optimization']},
    'Google Analytics': {'category': 'hard', 'aliases': ['google analytics', 'ga4']},
    'LLM APIs': {
       'category': 'hard',
       'aliases': [
           'llm api',
           'llm apis',
           'large language model api',
           'large language model apis',
           'openai api',
           'openai',
           'claude api',
           'claude',
           'anthropic',
        ],
    },
    'Embeddings': {
        'category': 'hard',
        'aliases': [
            'embedding',
            'embeddings',
            'vector embeddings',
            'text embeddings',
        ],
    },
    'AI Workflows': {
        'category': 'hard',
        'aliases': [
            'ai workflow',
            'ai workflows',
            'llm workflow',
            'llm workflows',
            'ai-assisted workflow',
            'ai assisted workflow',
        ],
    },

    'Artificial Intelligence': {
        'category': 'hard',
        'aliases': [
            'artificial intelligence',
            'ai',
            'ai landscape',
            'ai-driven',
            'ai driven',
            'ai-assisted',
            'ai assisted',
            'ai-assisted code development',
            'ai assisted code development',
            'ai-driven development',
            'ai driven development',
            'ai tools',
        ],
    },

    'Web Frameworks': {
         'category': 'hard',
         'aliases': [
             'web frameworks',
             'modern web frameworks',
             'javascript frameworks',
             'modern javascript frameworks',
             'react',
             'react.js',
             'angular',
             'express.js',
             'express',
             'next.js',
             'vue.js',
             'django',
             'flask',
            'fastapi',
        ],
    },

    # Marketing / growth / communications
    'Digital Marketing': {'category': 'hard', 'aliases': ['digital marketing']},
    'Content Marketing': {'category': 'hard', 'aliases': ['content marketing']},
    'Social Media Marketing': {'category': 'hard', 'aliases': ['social media marketing', 'social media management']},
    'Email Marketing': {'category': 'hard', 'aliases': ['email marketing', 'newsletter marketing']},
    'Copywriting': {'category': 'hard', 'aliases': ['copywriting', 'copy writing']},
    'Campaign Management': {'category': 'hard', 'aliases': ['campaign management', 'marketing campaigns', 'campaigns']},
    'Brand Strategy': {'category': 'hard', 'aliases': ['brand strategy', 'branding']},
    'Google Ads': {'category': 'hard', 'aliases': ['google ads', 'google adwords', 'adwords']},
    'Meta Ads': {'category': 'hard', 'aliases': ['meta ads', 'facebook ads', 'instagram ads']},
    'PPC': {'category': 'hard', 'aliases': ['ppc', 'pay per click', 'paid search']},
    'Marketing Automation': {'category': 'hard', 'aliases': ['marketing automation']},

    # Sales / customer success / business development
    'B2B Sales': {'category': 'hard', 'aliases': ['b2b sales', 'business to business sales']},
    'Lead Generation': {'category': 'hard', 'aliases': ['lead generation', 'lead gen']},
    'Prospecting': {'category': 'hard', 'aliases': ['prospecting', 'sales prospecting']},
    'Cold Calling': {'category': 'hard', 'aliases': ['cold calling', 'cold calls']},
    'CRM': {'category': 'hard', 'aliases': ['crm', 'customer relationship management']},
    'Account Management': {'category': 'hard', 'aliases': ['account management', 'key account management']},
    'Customer Success': {'category': 'hard', 'aliases': ['customer success']},
    'Sales Pipeline': {'category': 'hard', 'aliases': ['sales pipeline', 'pipeline management']},
    'Negotiation': {'category': 'hard', 'aliases': ['negotiation', 'negotiations']},
    'Client Relationship Management': {'category': 'hard', 'aliases': ['client relationship management', 'client relationships']},

    # Finance / accounting / banking
    'Accounting': {'category': 'hard', 'aliases': ['accounting']},
    'Bookkeeping': {'category': 'hard', 'aliases': ['bookkeeping', 'book keeping']},
    'Financial Reporting': {'category': 'hard', 'aliases': ['financial reporting', 'financial reports']},
    'Budgeting': {'category': 'hard', 'aliases': ['budgeting', 'budget management']},
    'Forecasting': {'category': 'hard', 'aliases': ['forecasting', 'financial forecasting']},
    'Accounts Payable': {'category': 'hard', 'aliases': ['accounts payable', 'ap']},
    'Accounts Receivable': {'category': 'hard', 'aliases': ['accounts receivable', 'ar']},
    'Payroll': {'category': 'hard', 'aliases': ['payroll']},
    'Tax Preparation': {'category': 'hard', 'aliases': ['tax preparation', 'tax filing', 'tax compliance']},
    'QuickBooks': {'category': 'hard', 'aliases': ['quickbooks', 'quick books']},
    'Bank Reconciliation': {'category': 'hard', 'aliases': ['bank reconciliation']},

    # Human resources / recruiting
    'Recruitment': {'category': 'hard', 'aliases': ['recruitment', 'recruiting']},
    'Talent Acquisition': {'category': 'hard', 'aliases': ['talent acquisition']},
    'Interviewing': {'category': 'hard', 'aliases': ['interviewing', 'candidate interviews']},
    'Onboarding': {'category': 'hard', 'aliases': ['onboarding', 'employee onboarding']},
    'HRIS': {'category': 'hard', 'aliases': ['hris', 'human resources information system']},
    'Employee Relations': {'category': 'hard', 'aliases': ['employee relations']},
    'Performance Management': {'category': 'hard', 'aliases': ['performance management']},
    'Benefits Administration': {'category': 'hard', 'aliases': ['benefits administration', 'employee benefits']},
    'HR Policies': {'category': 'hard', 'aliases': ['hr policies', 'human resources policies']},

    # Healthcare / nursing / care services
    'Patient Care': {'category': 'hard', 'aliases': ['patient care']},
    'Vital Signs': {'category': 'hard', 'aliases': ['vital signs']},
    'Medication Administration': {'category': 'hard', 'aliases': ['medication administration', 'administer medication']},
    'Clinical Documentation': {'category': 'hard', 'aliases': ['clinical documentation', 'clinical notes']},
    'EMR': {'category': 'hard', 'aliases': ['emr', 'electronic medical records', 'ehr', 'electronic health records']},
    'Triage': {'category': 'hard', 'aliases': ['triage']},
    'Infection Control': {'category': 'hard', 'aliases': ['infection control']},
    'CPR': {'category': 'hard', 'aliases': ['cpr', 'cardiopulmonary resuscitation']},
    'First Aid': {'category': 'hard', 'aliases': ['first aid']},
    'Nursing': {'category': 'hard', 'aliases': ['nursing', 'nurse']},

    # Operations / logistics / supply chain
    'Inventory Management': {'category': 'hard', 'aliases': ['inventory management', 'inventory control']},
    'Procurement': {'category': 'hard', 'aliases': ['procurement', 'purchasing']},
    'Supply Chain': {'category': 'hard', 'aliases': ['supply chain', 'supply chain management']},
    'Logistics': {'category': 'hard', 'aliases': ['logistics']},
    'Warehouse Operations': {'category': 'hard', 'aliases': ['warehouse operations', 'warehouse management']},
    'Vendor Management': {'category': 'hard', 'aliases': ['vendor management', 'supplier management']},
    'Order Fulfillment': {'category': 'hard', 'aliases': ['order fulfillment', 'order fulfilment']},
    'Quality Control': {'category': 'hard', 'aliases': ['quality control', 'qc']},
    'Process Improvement': {'category': 'hard', 'aliases': ['process improvement', 'continuous improvement']},
    'ERP': {'category': 'hard', 'aliases': ['erp', 'enterprise resource planning']},

    # Education / teaching / training
    'Lesson Planning': {'category': 'hard', 'aliases': ['lesson planning', 'lesson plans']},
    'Classroom Management': {'category': 'hard', 'aliases': ['classroom management']},
    'Assessment Design': {'category': 'hard', 'aliases': ['assessment design', 'assessments']},
    'Student Engagement': {'category': 'hard', 'aliases': ['student engagement']},
    'Tutoring': {'category': 'hard', 'aliases': ['tutoring', 'tutor']},
    'Learning Outcomes': {'category': 'hard', 'aliases': ['learning outcomes']},
    'Differentiated Instruction': {'category': 'hard', 'aliases': ['differentiated instruction']},
    'Special Education': {'category': 'hard', 'aliases': ['special education', 'special needs']},

    # Design / creative / media
    'Graphic Design': {'category': 'hard', 'aliases': ['graphic design', 'graphic designer']},
    'Adobe Photoshop': {'category': 'hard', 'aliases': ['adobe photoshop', 'photoshop']},
    'Adobe Illustrator': {'category': 'hard', 'aliases': ['adobe illustrator', 'illustrator']},
    'Adobe InDesign': {'category': 'hard', 'aliases': ['adobe indesign', 'indesign']},
    'Brand Identity': {'category': 'hard', 'aliases': ['brand identity', 'visual identity']},
    'Wireframing': {'category': 'hard', 'aliases': ['wireframing', 'wireframes']},
    'Prototyping': {'category': 'hard', 'aliases': ['prototyping', 'prototype']},
    'Typography': {'category': 'hard', 'aliases': ['typography']},
    'Motion Graphics': {'category': 'hard', 'aliases': ['motion graphics']},
    'Video Editing': {'category': 'hard', 'aliases': ['video editing', 'video editor']},

    # Engineering / construction / architecture
    'AutoCAD': {'category': 'hard', 'aliases': ['autocad', 'auto cad']},
    'Revit': {'category': 'hard', 'aliases': ['revit']},
    'Civil Engineering': {'category': 'hard', 'aliases': ['civil engineering']},
    'Mechanical Engineering': {'category': 'hard', 'aliases': ['mechanical engineering']},
    'Electrical Engineering': {'category': 'hard', 'aliases': ['electrical engineering']},
    'Site Supervision': {'category': 'hard', 'aliases': ['site supervision', 'site supervisor']},
    'Safety Compliance': {'category': 'hard', 'aliases': ['safety compliance', 'health and safety']},
    'QA/QC': {'category': 'hard', 'aliases': ['qa/qc', 'qa qc', 'quality assurance quality control']},
    'Technical Drawing': {'category': 'hard', 'aliases': ['technical drawing', 'technical drawings']},
    'Quantity Surveying': {'category': 'hard', 'aliases': ['quantity surveying', 'quantity surveyor']},

    # Administration / office / support
    'Administrative Support': {'category': 'hard', 'aliases': ['administrative support', 'admin support']},
    'Calendar Management': {'category': 'hard', 'aliases': ['calendar management', 'schedule management']},
    'Data Entry': {'category': 'hard', 'aliases': ['data entry']},
    'Document Management': {'category': 'hard', 'aliases': ['document management', 'file management']},
    'Office Administration': {'category': 'hard', 'aliases': ['office administration', 'office admin']},
    'Travel Coordination': {'category': 'hard', 'aliases': ['travel coordination', 'travel arrangements']},
    'Customer Support': {'category': 'hard', 'aliases': ['customer support', 'customer service support']},
    'Ticketing Systems': {'category': 'hard', 'aliases': ['ticketing systems', 'zendesk', 'freshdesk']},

    # Retail / e-commerce
    'Retail Sales': {'category': 'hard', 'aliases': ['retail sales']},
    'Merchandising': {'category': 'hard', 'aliases': ['merchandising', 'visual merchandising']},
    'Cash Handling': {'category': 'hard', 'aliases': ['cash handling']},
    'Shopify': {'category': 'hard', 'aliases': ['shopify']},
    'E-commerce': {'category': 'hard', 'aliases': ['e-commerce', 'ecommerce', 'online store']},
    'Product Listing': {'category': 'hard', 'aliases': ['product listing', 'product listings']},
    'Order Processing': {'category': 'hard', 'aliases': ['order processing']},

    # Learning / content roles
    'Content Strategy': {'category': 'hard', 'aliases': ['content strategy']},
    'UX Research': {'category': 'hard', 'aliases': ['ux research', 'user research']},
    'UI Design': {'category': 'hard', 'aliases': ['ui design', 'user interface design']},
    'UX Design': {'category': 'hard', 'aliases': ['ux design', 'user experience design']},
    'Content Design': {'category': 'hard', 'aliases': ['content design', 'content designer']},
    'Learning Design': {'category': 'hard', 'aliases': ['learning design', 'learning designer']},
    'Instructional Design': {'category': 'hard', 'aliases': ['instructional design', 'instructional designer']},
    'E-learning': {'category': 'hard', 'aliases': ['e-learning', 'elearning', 'online learning', 'digital learning']},
    'LMS': {'category': 'hard', 'aliases': ['lms', 'learning management system', 'learning management systems']},
    'Authoring Tools': {'category': 'hard', 'aliases': ['authoring tools', 'authoring tool', 'authoring software', 'e-learning authoring tools', 'elearning authoring tools']},
    'Training Content': {'category': 'hard', 'aliases': ['training content', 'training materials', 'learning materials']},
    'Content Development': {'category': 'hard', 'aliases': ['content development', 'content creation', 'develop content', 'create content']},
    'PowerPoint': {'category': 'hard', 'aliases': ['powerpoint', 'power point', 'microsoft powerpoint']},
    'Adult Learning': {'category': 'hard', 'aliases': ['adult learning', 'learning theory', 'learning theories']},
    'Curriculum Development': {'category': 'hard', 'aliases': ['curriculum development', 'curriculum design']},
    'Learning Experience': {'category': 'hard', 'aliases': ['learning experience', 'learning experiences']},
    'Education Technology': {'category': 'hard', 'aliases': ['education technology', 'edtech']},
    'Digital Training': {'category': 'hard', 'aliases': ['digital training']},
    'Educational Content': {'category': 'hard', 'aliases': ['educational content']},
    'Workshops': {'category': 'hard', 'aliases': ['workshops', 'workshop']},
    'Canva': {'category': 'hard', 'aliases': ['canva']},
    'Articulate': {'category': 'hard', 'aliases': ['articulate']},
    'Rise': {'category': 'hard', 'aliases': ['rise']},
    'H5P': {'category': 'hard', 'aliases': ['h5p']},
    'Video Tools': {'category': 'hard', 'aliases': ['video tools', 'basic video', 'video']},

    # Hospitality / service roles
    'Hospitality': {'category': 'hard', 'aliases': ['hospitality', 'hospitality service', 'hospitality industry']},
    'Restaurant Service': {'category': 'hard', 'aliases': ['restaurant service', 'restaurant environment', 'restaurant or bar', 'restaurant', 'dining setting', 'full-service dining', 'lifestyle dining']},
    'Bar Service': {'category': 'hard', 'aliases': ['bar service', 'bar environment', 'bar']},
    'Food and Beverage': {'category': 'hard', 'aliases': ['food and beverage', 'food & beverage', 'f and b', 'f&b', 'food beverages', 'food and beverages']},
    'Italian Cuisine': {'category': 'hard', 'aliases': ['italian cuisine', 'italian food', 'italian service traditions', 'italian service']},
    'Guest Experience': {'category': 'hard', 'aliases': ['guest experience', 'guest experiences', 'memorable guest experience', 'customer experience', 'guest service', 'customer service']},
    'Guest Hosting': {'category': 'hard', 'aliases': ['guest hosting', 'welcoming guests', 'hosted guests', 'hosting guests']},
    'Menu Guidance': {'category': 'hard', 'aliases': ['menu guidance', 'menu recommendations', 'menu recommendation', 'menu knowledge']},
    'Order Taking': {'category': 'hard', 'aliases': ['order taking', 'take orders', 'taking orders', 'processed orders', 'order processing']},
    'POS Systems': {'category': 'hard', 'aliases': ['pos', 'pos system', 'pos systems', 'point of sale', 'payment system']},
    'Payment Handling': {'category': 'hard', 'aliases': ['payment handling', 'payment processing', 'processed payment', 'cash handling', 'check bill', 'print bill', 'accept payment']},
    'Wine Service': {'category': 'hard', 'aliases': ['wine service', 'wine service support', 'wine knowledge']},
    'Fine Dining': {'category': 'hard', 'aliases': ['fine dining', 'fine dining standards']},
    'Table Setup': {'category': 'hard', 'aliases': ['table setup', 'table setting', 'service area setup', 'cutlery', 'glassware']},
    'Cleanliness and Hygiene': {'category': 'hard', 'aliases': ['cleanliness', 'hygiene', 'hygiene standards', 'clean dining', 'clean service areas']},
    'Stock Organization': {'category': 'hard', 'aliases': ['stock organization', 'stock organisation', 'organized stock', 'stock control']},
    'Rotating Shifts': {'category': 'hard', 'aliases': ['rotating shifts', 'shift work', 'weekends', 'public holidays', 'weekend shifts', 'holiday shifts']},
    'Management Support': {
        'category': 'soft',
        'aliases': [
            'leadership support',
            'management support',
            'assist line managers',
            'assist managers',
            'support line managers',
            'support managers',
            'help managers',
            'handle task assignment',
            'task assignment',
            'assign tasks',
            'support team leads',
        ],
    },

    'WSQ Certificate': {
        'category': 'hard',
        'aliases': [
            'wsq certificate',
            'wsq certification',
            'wsq food safety certification',
            'wsq food safety certificate',
            'wsq',
            'food safety certification',
            'food safety certificate',
        ],
    },

    # Soft skills and human requirements
        'Initiative / Proactive': {
        'category': 'soft',
        'aliases': [
            'initiative',
            'take initiative',
            'takes initiative',
            'taking initiative',
            'self-starter',
            'proactive',
            'introduce new tools',
            'introduce new workflows',
            'introduce new frameworks',
            'without being asked',
        ],
    },
    'Creativity': {
        'category': 'soft',
        'aliases': [
            'creative',
            'creativity',
            'creative solutions',
            'innovative',
            'innovation',
            'find creative solutions',
        ],
    },
    'Continuous Improvement': {
        'category': 'soft',
        'aliases': [
            'continuous improvement',
            'improvement',
            'improvements',
            'technical improvements',
            'improve',
            'enhance productivity',
            'improve productivity',
            'best practices',
        ],
    },
        'Collaboration': {
        'category': 'soft',
        'aliases': [
            'collaboration',
            'collaborative',
            'collaborate',
            'worked with',
            'work with',
            'contribute to discussions',
            'architecture discussions',
            'technical discussions',
            'worked with product managers',
            'worked with backend developers',
            'team',
            'agile team',
        ],
    },
    'Communication': {
        'category': 'soft',
        'aliases': [
            'communication',
            'communications',
            'communicate',
            'communicating',
            'clarify requirements',
            'release notes',
            'worked with product managers',
            'worked with backend developers',
        ],
    },
    'Async Collaboration': {
        'category': 'soft',
        'aliases': [
            'async-first',
            'async first',
            'distributed team',
            'globally distributed team',
            'remote collaboration',
        ],
    },

    'Pragmatism': {
        'category': 'soft',
        'aliases': [
            'pragmatic',
            'pragmatism',
            'focused on solving problems',
            'not defending a specific stack',
        ],
    },
    'Interpersonal Skills': {'category': 'soft', 'aliases': ['interpersonal', 'people skills']},
    'Teamwork': {'category': 'soft', 'aliases': ['teamwork', 'team player', 'team collaboration', 'collaborate', 'supports colleagues', 'support colleagues']},
        'Leadership': {
        'category': 'soft',
        'aliases': [
            'leadership',
            'lead team',
            'leading',
            'lead technical improvements',
            'lead improvements',
            'technical leadership',
        ],
    },
    'Adaptability': {'category': 'soft', 'aliases': ['adaptable', 'adaptability', 'flexible', 'flexibility', 'able to adapt']},
    'Eager to Learn': {'category': 'soft', 'aliases': ['eager to learn', 'willingness to learn', 'willing to learn', 'learn more', 'enthusiastic to learn']},
    'Enthusiasm': {'category': 'soft', 'aliases': ['enthusiastic', 'enthusiasm', 'passionate', 'passion']},
    'Friendly Presence': {'category': 'soft', 'aliases': ['friendly', 'warm', 'welcoming', 'cheerful', 'positive attitude']},
    'Confident Presence': {'category': 'soft', 'aliases': ['confident', 'confidence', 'confident presence']},
    'Detail Orientation': {'category': 'soft', 'aliases': ['detail-oriented', 'detail oriented', 'attention to detail', 'presentation', 'cleanliness and presentation']},
    'Professional Presentation': {'category': 'soft', 'aliases': ['well-groomed', 'presentable', 'professional appearance', 'professional presentation', 'grooming']},
    'Takes Feedback Well': {'category': 'soft', 'aliases': ['take direction', 'takes direction', 'respond positively to feedback', 'respond to feedback', 'take feedback', 'coachable', 'open to training']},
    'Time Management': {'category': 'soft', 'aliases': ['time management', 'deadlines', 'timely']},
    'Problem Solving': {
        'category': 'soft',
        'aliases': [
            'problem solving',
            'problem-solving',
            'technical problem solving',
            'solve problems',
            'solve technical challenges',
            'technical challenges',
            'creative solutions',
            'troubleshoot',
            'debug',
            'troubleshooting',
            'debugging',
            'fixed issues',
            'bug fixes',
            'fixed cross-browser issues',
            'reduced defects',
        ],
    },
    'Stakeholder Management': {'category': 'soft', 'aliases': ['stakeholder management', 'stakeholders']},
    'Customer Focus': {'category': 'soft', 'aliases': ['customer focus', 'customer-focused', 'customer oriented', 'customer-oriented']},
    'Empathy': {'category': 'soft', 'aliases': ['empathy', 'empathetic']},
    'Critical Thinking': {'category': 'soft', 'aliases': ['critical thinking']},
    'Organization': {'category': 'soft', 'aliases': ['organization', 'organisation', 'organized', 'organised']},
    'Attention to Safety': {'category': 'soft', 'aliases': ['safety-minded', 'safety conscious', 'safety-focused']},
}

INDUSTRY_REQUIREMENTS: dict[str, list[str]] = {
    # Hospitality / service phrases
    'Restaurant or bar environment': ['restaurant or bar environment', 'restaurant environment', 'bar environment', 'restaurant or bar', 'full-service', 'lifestyle dining', 'dining setting'],
    'Hospitality mindset': ['passion for hospitality', 'hospitality'],
    'Memorable guest experiences': ['memorable guest experiences', 'memorable guest experience', 'guest experiences', 'guest experience'],
    'Food and beverage knowledge': ['food and beverages', 'food and beverage', 'food & beverage', 'f&b'],
    'Italian cuisine or service traditions': ['italian cuisine', 'italian service traditions', 'italian service'],
    'Smooth daily operations': ['smooth daily operations', 'daily operations', 'peak hours'],
    'Fast-paced restaurant environment': ['fast-paced restaurant environment', 'fast-paced restaurant', 'fast-paced'],
    'Cleanliness and presentation': ['cleanliness and presentation', 'cleanliness', 'presentation'],
    'Rotating shifts, weekends, and public holidays': ['rotating shifts', 'weekends', 'public holidays'],

    # Learning / content / EdTech phrases
    'Learning experience': ['learning experience', 'learning experiences'],
    'Education technology / EdTech': ['education technology', 'edtech'],
    'Digital training': ['digital training'],
    'Clear learning flows': ['learning flows', 'break down complex information'],
    'Educational content': ['educational content'],
    'Professional training': ['professional training', 'workplace learning'],
    'Training or workshops': ['training', 'workshops', 'workshop'],
}


# Additional industry phrase groups help the strict ATS work across more job families without using AI.
INDUSTRY_REQUIREMENTS.update({
    # Technology / data / product phrases
    'Software development lifecycle': ['software development lifecycle', 'sdlc'],
    'Frontend development': ['frontend development', 'front-end development', 'front end development'],
    'Backend development': ['backend development', 'back-end development', 'back end development'],
    'API development': ['api development', 'rest api', 'restful api'],
    'Cloud infrastructure': ['cloud infrastructure', 'cloud services', 'aws', 'azure', 'gcp'],
    'Data visualization': ['data visualization', 'data visualisation', 'dashboards'],
    'Agile delivery': ['agile', 'scrum', 'sprint planning'],

    # Marketing / communications phrases
    'Digital campaign execution': ['digital campaigns', 'campaign execution', 'marketing campaigns'],
    'Audience growth': ['audience growth', 'grow audience', 'community growth'],
    'Brand awareness': ['brand awareness', 'brand visibility'],
    'Marketing performance reporting': ['marketing performance', 'campaign performance', 'performance reporting'],

    # Sales / customer success phrases
    'Revenue targets': ['revenue targets', 'sales targets', 'quota'],
    'Pipeline generation': ['pipeline generation', 'build pipeline', 'sales pipeline'],
    'Client retention': ['client retention', 'customer retention', 'renewals'],
    'Customer onboarding': ['customer onboarding', 'client onboarding'],

    # Finance / accounting phrases
    'Month-end close': ['month-end close', 'month end close', 'closing process'],
    'Financial controls': ['financial controls', 'internal controls'],
    'Budget variance analysis': ['budget variance', 'variance analysis'],
    'Regulatory compliance': ['regulatory compliance', 'compliance requirements'],

    # HR / recruitment phrases
    'Full-cycle recruitment': ['full-cycle recruitment', 'full cycle recruitment', 'end-to-end recruitment'],
    'Candidate screening': ['candidate screening', 'screen candidates'],
    'Employee lifecycle': ['employee lifecycle', 'employee life cycle'],
    'HR operations': ['hr operations', 'people operations'],

    # Healthcare / care phrases
    'Direct patient care': ['direct patient care', 'patient care'],
    'Clinical safety': ['clinical safety', 'patient safety'],
    'Medical records': ['medical records', 'electronic medical records', 'electronic health records'],
    'Infection prevention': ['infection prevention', 'infection control'],

    # Operations / logistics phrases
    'Inventory accuracy': ['inventory accuracy', 'stock accuracy'],
    'Warehouse efficiency': ['warehouse efficiency', 'warehouse operations'],
    'Supplier coordination': ['supplier coordination', 'vendor coordination'],
    'On-time delivery': ['on-time delivery', 'on time delivery', 'delivery schedules'],

    # Education / training phrases
    'Student learning outcomes': ['student learning outcomes', 'learning outcomes'],
    'Lesson delivery': ['lesson delivery', 'deliver lessons', 'teaching lessons'],
    'Classroom engagement': ['classroom engagement', 'student engagement'],
    'Assessment and feedback': ['assessment and feedback', 'student assessment'],

    # Design / creative phrases
    'Visual design': ['visual design', 'graphic design'],
    'Design systems': ['design systems', 'design system'],
    'Creative production': ['creative production', 'content production'],
    'User-centered design': ['user-centered design', 'user centred design', 'human-centered design'],

    # Engineering / construction phrases
    'Site safety': ['site safety', 'construction safety'],
    'Technical documentation': ['technical documentation', 'technical drawings'],
    'Project planning': ['project planning', 'construction planning'],
    'Quality assurance': ['quality assurance', 'qa/qc', 'qa qc'],

    # Administration / support phrases
    'Office coordination': ['office coordination', 'administrative coordination'],
    'Scheduling support': ['scheduling support', 'calendar management'],
    'Customer issue resolution': ['issue resolution', 'customer issue resolution', 'resolve customer issues'],
    'Document control': ['document control', 'document management'],

    # Retail / e-commerce phrases
    'Store operations': ['store operations', 'retail operations'],
    'Product merchandising': ['product merchandising', 'visual merchandising'],
    'Online order management': ['online order management', 'e-commerce orders', 'ecommerce orders'],
    'Customer checkout': ['customer checkout', 'checkout process', 'cash handling'],
})

ROLE_SYNONYM_GROUPS = [
    ['waiter', 'server', 'restaurant server', 'f&b server', 'f and b server', 'food and beverage server', 'service crew'],
    ['waitress', 'server', 'restaurant server', 'f&b server', 'service crew'],
    ['bartender', 'bar tender', 'bar staff'],
    ['software developer', 'software engineer', 'developer', 'programmer'],
    ['frontend developer', 'front end developer', 'frontend engineer', 'front end engineer', 'react developer'],
    ['backend developer', 'back end developer', 'backend engineer', 'back end engineer'],
    ['data analyst', 'data analytics analyst', 'business intelligence analyst', 'bi analyst'],
    ['project manager', 'project lead', 'program manager'],
    ['learning designer', 'instructional designer', 'e-learning developer', 'content developer'],
]

STOP_WORDS = {
    'and', 'or', 'the', 'a', 'an', 'to', 'of', 'for', 'in', 'on', 'with', 'as', 'by',
    'from', 'is', 'are', 'be', 'will', 'you', 'your', 'our', 'their', 'at', 'this',
    'that', 'we', 'it', 'if', 'not', 'can', 'must', 'should', 'role', 'job', 'candidate',
    'team', 'work', 'experience', 'years', 'year', 'strong', 'good', 'what', 'who',
    'whom', 'whose', 'where', 'when', 'why', 'how', 'e.g', 'eg', 'etc', 'basic',
    'related', 'interest', 'interested', 'ability', 'approach', 'different', 'professional',
    'proactive', 'background', 'responsibilities', 'requirements', 'preferred', 'nice', 'graduate',
    'have', 'plus', 'including', 'include', 'based', 'using', 'more', 'able', 'well', 'comfortable',
    'during', 'daily', 'positive', 'preferably', 'at', 'least', 'environment', 'setting',
}


def clamp(value: float, minimum: float = 0, maximum: float = 100) -> int:
    return int(round(max(minimum, min(maximum, value))))


def normalize(text: str) -> str:
    return re.sub(r'\s+', ' ', text or '').strip().lower()


def normalize_for_matching(text: str) -> str:
    text = (text or '').lower()
    text = text.replace('&', ' and ')
    text = text.replace('/', ' ')
    text = re.sub(r'[\u2010-\u2015]', '-', text)
    text = re.sub(r'[^a-z0-9+#.]+', ' ', text)
    return re.sub(r'\s+', ' ', text).strip()


def contains_phrase(text: str, phrase: str) -> bool:
    normalized = normalize_for_matching(text)
    phrase = normalize_for_matching(phrase)
    if not phrase:
        return False
    escaped = re.escape(phrase)
    return re.search(rf'(?<![a-z0-9]){escaped}(?![a-z0-9])', normalized) is not None


def contains_any(text: str, phrases: list[str]) -> bool:
    return any(contains_phrase(text, phrase) for phrase in phrases)


def tokenize_words(text: str) -> list[str]:
    normalized = normalize_for_matching(text)
    return [
        word for word in re.findall(r'[a-z][a-z0-9+#.]{1,}', normalized)
        if word not in STOP_WORDS and len(word) > 2
    ]


def unique_preserve_order(items: list[str]) -> list[str]:
    output: list[str] = []
    seen: set[str] = set()
    for item in items:
        clean = item.strip()
        key = clean.lower()
        if clean and key not in seen:
            output.append(clean)
            seen.add(key)
    return output


def expand_controlled_equivalences(alias: str) -> list[str]:
    normalized = normalize_for_matching(alias)
    variants = CONTROLLED_EQUIVALENCES.get(normalized, [alias])
    return unique_preserve_order([alias] + variants)


def find_present_aliases(text: str, aliases: list[str]) -> list[str]:
    """Return aliases that appear in text after strict deterministic matching.

    Matching is still rule-based and explainable. A small controlled-equivalence table
    handles common abbreviations such as LMS/Learning Management System, PPT/PowerPoint,
    F&B/Food and Beverage, POS/Point of Sale, UI/UX, SDLC, and JS/JavaScript.
    """
    found: list[str] = []
    for alias in aliases:
        for variant in expand_controlled_equivalences(str(alias)):
            if contains_phrase(text, variant):
                found.append(alias)
                break
    return unique_preserve_order(found)


def extract_catalog_requirements(text: str, category: str | None = None) -> list[dict[str, Any]]:
    requirements: list[dict[str, Any]] = []
    for canonical, config in SKILL_CATALOG.items():
        if category and config.get('category') != category:
            continue
        aliases = config.get('aliases', [canonical])
        job_keywords = find_present_aliases(text, aliases)
        if job_keywords:
            requirements.append({
                'name': canonical,
                'category': config.get('category', ''),
                'job_keywords': job_keywords,
                'source': 'catalog',
            })
    return requirements


_DYNAMIC_REQUIREMENT_CACHE: dict[str, dict[str, list[dict[str, Any]]]] = {}


def get_dynamic_requirements(job_description: str) -> dict[str, list[dict[str, Any]]]:
    cache_key = job_description or ''
    if cache_key not in _DYNAMIC_REQUIREMENT_CACHE:
        _DYNAMIC_REQUIREMENT_CACHE[cache_key] = extract_dynamic_keyword_requirements(job_description, SKILL_CATALOG)
    return _DYNAMIC_REQUIREMENT_CACHE[cache_key]


def merge_requirement_lists(*groups: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Merge catalog and dynamic requirements without hiding exact ATS keywords.

    Catalog items are kept first because they have cleaner labels. Dynamic YAKE/list/regex
    items then fill the gaps for tools and phrases not present in SKILL_CATALOG.
    """
    output: list[dict[str, Any]] = []
    seen_names: set[str] = set()
    seen_keyword_sets: set[tuple[str, ...]] = set()

    for group in groups:
        for item in group or []:
            name = str(item.get('name', '')).strip()
            if not name:
                continue
            name_key = normalize_for_matching(name)
            keywords = unique_preserve_order([str(keyword) for keyword in item.get('job_keywords', []) if str(keyword).strip()] or [name])
            keyword_key = tuple(sorted(normalize_for_matching(keyword) for keyword in keywords))

            if name_key in seen_names or keyword_key in seen_keyword_sets:
                continue

            merged_item = dict(item)
            merged_item['job_keywords'] = keywords
            output.append(merged_item)
            seen_names.add(name_key)
            seen_keyword_sets.add(keyword_key)

    return output


# Final safety layer for noisy dynamic ATS keywords. This is intentionally based on
# phrase quality, source, and generic grammar shape rather than manually listing every
# possible bad phrase. It works across industries because it rejects sentence fragments
# such as "Design And Develop Robust" while keeping clean terms such as "Patient Care",
# "Financial Reporting", "QuickBooks", "Prisma ORM", or "Inventory Management".
REQUIREMENT_ACTION_VERBS = {
    'build', 'test', 'improve', 'design', 'develop', 'work', 'contribute', 'lead',
    'embrace', 'implement', 'troubleshoot', 'debug', 'find', 'take', 'introduce',
    'manage', 'support', 'prepare', 'maintain', 'coordinate', 'assist', 'deliver',
    'create', 'optimize', 'optimise', 'analyse', 'analyze', 'monitor', 'ensure',
    'handle', 'process', 'perform', 'drive', 'execute', 'collaborate', 'communicate',
}

REQUIREMENT_CONNECTOR_WORDS = {
    'and', 'or', 'that', 'to', 'with', 'using', 'for', 'from', 'into', 'through',
    'across', 'between', 'within', 'such', 'as', 'by', 'of', 'on', 'in', 'at',
}

REQUIREMENT_GENERIC_NOISE = {
    'solid', 'familiarity', 'familiar', 'fundamentals', 'fundamental', 'modern',
    'preferred', 'optional', 'plus', 'similar', 'basic', 'concept', 'concepts',
    'knowledge', 'understanding', 'comfortable', 'excellent', 'strong', 'good',
    'nice', 'robust', 'responsive', 'evolving', 'new', 'improve', 'improvements',
    'enhance', 'productivity', 'power', 'powered', 'using', 'use', 'uses', 'build',
    'built', 'test', 'tests', 'develop', 'develops', 'developed', 'design', 'designs',
    'designed', 'implement', 'implements', 'implemented', 'contribute', 'contributes',
    'contributed', 'lead', 'leads', 'leading', 'take', 'takes', 'took', 'introduce',
    'introduces', 'introduced', 'find', 'finds', 'found', 'work', 'works', 'worked',
    'with', 'that', 'what', 'who', 'where', 'when', 'why', 'how', 'this', 'these',
    'those', 'such', 'through', 'across', 'between', 'within', 'into', 'from', 'for',
    'about', 'discussion', 'discussions', 'challenge', 'challenges', 'application',
    'applications', 'frontend', 'frontends', 'backend', 'backends', 'api', 'apis',
    'orm', 'tool', 'tools', 'system', 'systems', 'process', 'processes', 'framework',
    'frameworks', 'skill', 'skills', 'experience', 'experiences', 'background',
    'requirement', 'requirements', 'responsibility', 'responsibilities', 'candidate',
    'environment', 'mindset', 'attitude', 'ability', 'abilities',
}

CANONICAL_REQUIREMENT_NAMES = {
    'restful api': 'REST API',
    'restful apis': 'REST API',
    'rest api': 'REST API',
    'rest apis': 'REST API',
    'nodejs': 'Node.js',
    'node js': 'Node.js',
    'nextjs': 'Next.js',
    'next js': 'Next.js',
    'vuejs': 'Vue',
    'vue js': 'Vue',
    'reactjs': 'React',
    'react js': 'React',
    'prisma orm': 'Prisma ORM',
    'prisma': 'Prisma ORM',
    'clean code': 'Clean Code',
    'type safety': 'Type Safety',
    'type safe': 'Type Safety',
    'best practices': 'Best Practices',
    'debug': 'Debugging',
    'debugging': 'Debugging',
    'troubleshoot': 'Troubleshooting',
    'troubleshooting': 'Troubleshooting',
    'llm api': 'LLM APIs',
    'llm apis': 'LLM APIs',
    'large language model api': 'LLM APIs',
    'large language model apis': 'LLM APIs',
    'openai': 'LLM APIs',
    'claude': 'LLM APIs',
    'anthropic': 'LLM APIs',
    'embedding': 'Embeddings',
    'embeddings': 'Embeddings',
    'ai workflow': 'AI Workflows',
    'ai workflows': 'AI Workflows',
    'llm workflow': 'AI Workflows',
    'llm workflows': 'AI Workflows',
    'leadership support': 'Management Support',
    'management support': 'Management Support',
    'assist line managers': 'Management Support',
    'assisting line managers': 'Management Support',
    'support line managers': 'Management Support',
    'task assignment': 'Management Support',
    'handle task assignment': 'Management Support',
    'wsq': 'WSQ Certificate',
    'wsq certificate': 'WSQ Certificate',
    'wsq certification': 'WSQ Certificate',
    'wsq food safety certificate': 'WSQ Certificate',
    'wsq food safety certification': 'WSQ Certificate',
    'food safety certificate': 'WSQ Certificate',
    'food safety certification': 'WSQ Certificate',
}


def requirement_source_is_untrusted(source: str) -> bool:
    return str(source or '').split('+')[0] in {'yake', 'fallback_ngram'}


def requirement_tool_like(name: str) -> bool:
    raw = re.sub(r'\s+', ' ', str(name or '')).strip()
    normalized = normalize_for_matching(raw)
    if not raw or not normalized:
        return False
    words = normalized.split()
    if not words:
        return False
    if words[0] in REQUIREMENT_GENERIC_NOISE or words[0] in REQUIREMENT_ACTION_VERBS or words[0] in REQUIREMENT_CONNECTOR_WORDS:
        return False
    if words[-1] in REQUIREMENT_GENERIC_NOISE or words[-1] in REQUIREMENT_ACTION_VERBS or words[-1] in REQUIREMENT_CONNECTOR_WORDS:
        return False
    if re.fullmatch(r'[A-Z0-9+#.]{2,}(?:\s+[A-Z0-9+#.]{2,}){0,1}', raw):
        return True
    if re.fullmatch(r'[A-Z][A-Za-z0-9+#.]{1,}\s+(?:ORM|CRM|ERP|HRIS|API|CMS|SQL|BI|AI|ML|DB|Suite|Cloud|Studio|Workspace|Analytics|Office|Teams|Slack)', raw):
        return True
    if len(words) == 1 and re.fullmatch(r'[A-Z][A-Za-z0-9+#.]{1,}', raw):
        return True
    if any(char in raw for char in ['#', '+', '/']) and len(words) <= 2:
        return True
    if re.search(r'(?:\.js|js)$', normalized) and len(words) == 1:
        return True
    if re.search(r'\b(?:sql|orm|crm|erp|hris|api|cms|bi|ai|ml|cloud|suite|studio|analytics)\b', normalized):
        return len(words) <= 2 and not requirement_has_fragment_shape(name)
    return False


def requirement_has_fragment_shape(name: str) -> bool:
    normalized = normalize_for_matching(str(name or ''))
    words = normalized.split()
    if not words:
        return True
    if len(words) >= 4:
        return True
    if words[0] in REQUIREMENT_ACTION_VERBS:
        return True
    if any(word in REQUIREMENT_CONNECTOR_WORDS for word in words[1:-1]):
        return True
    if sum(1 for word in words if word in REQUIREMENT_ACTION_VERBS) >= 2:
        return True
    if words[-1] in REQUIREMENT_GENERIC_NOISE and not requirement_tool_like(name):
        return True
    if len(words) == 1 and words[0] in REQUIREMENT_GENERIC_NOISE:
        return True
    return False


def requirement_clean_noun_phrase(name: str) -> bool:
    normalized = normalize_for_matching(str(name or ''))
    words = normalized.split()
    if not words:
        return False
    if requirement_tool_like(name):
        return True
    strong_domain_endings = {
        'analysis', 'analytics', 'reporting', 'management', 'administration',
        'documentation', 'coordination', 'planning', 'development', 'testing',
        'debugging', 'troubleshooting', 'architecture', 'design', 'research',
        'care', 'screening', 'onboarding', 'recruitment', 'accounting', 'bookkeeping',
        'forecasting', 'budgeting', 'procurement', 'logistics', 'compliance',
        'merchandising', 'copywriting', 'marketing', 'sales', 'support', 'service',
        'training', 'teaching', 'tutoring', 'safety', 'quality', 'auditing',
        'reconciliation', 'payroll', 'inventory', 'database', 'databases', 'api',
        'apis', 'practices', 'improvement', 'improvements', 'workflow', 'workflows',
    }
    if 2 <= len(words) <= 3 and words[-1] in strong_domain_endings:
        return not requirement_has_fragment_shape(name)
    return False


def requirement_is_low_quality(name: str, source: str = '', category: str | None = None) -> bool:
    normalized = normalize_for_matching(str(name or ''))
    if not normalized:
        return True
    if normalized in REQUIREMENT_GENERIC_NOISE:
        return True
    if normalized in CANONICAL_REQUIREMENT_NAMES:
        return False
    if requirement_tool_like(name):
        return False
    if requirement_source_is_untrusted(source):
        return not requirement_clean_noun_phrase(name)
    if requirement_has_fragment_shape(name) and not requirement_clean_noun_phrase(name):
        # Catalog and regex terms are trusted, but dynamic list/YAKE sentence fragments are not.
        if str(source or '').startswith(('catalog', 'regex', 'canonicalized')):
            return False
        return True
    return False


def clean_requirement_items(requirements: list[dict[str, Any]], category: str | None = None) -> list[dict[str, Any]]:
    cleaned: list[dict[str, Any]] = []
    seen: set[str] = set()

    for item in requirements or []:
        name = str(item.get('name', '')).strip()
        source = str(item.get('source', ''))
        if not name:
            continue

        name_key = normalize_for_matching(name)
        canonical_name = CANONICAL_REQUIREMENT_NAMES.get(name_key, name)
        canonical_key = normalize_for_matching(canonical_name)

        if requirement_is_low_quality(canonical_name, source=source, category=category):
            continue

        keywords = unique_preserve_order([
            str(keyword)
            for keyword in item.get('job_keywords', [])
            if str(keyword).strip()
            and not requirement_is_low_quality(str(keyword), source=source, category=category)
        ] or [canonical_name])

        if canonical_name != name:
            keywords = unique_preserve_order(keywords + [canonical_name])

        if canonical_key in seen:
            continue

        cleaned_item = dict(item)
        cleaned_item['name'] = canonical_name
        cleaned_item['job_keywords'] = keywords
        cleaned.append(cleaned_item)
        seen.add(canonical_key)

    return cleaned


def extract_catalog_terms(text: str, category: str | None = None) -> list[str]:
    return [item['name'] for item in extract_catalog_requirements(text, category)]


def get_requirement_match_aliases(requirement: dict[str, Any]) -> list[str]:
    """Build fair resume-side aliases for one requirement.

    The JD may say "creative solutions", while the resume says "Problem Solving".
    The requirement should match through the canonical skill's aliases, not only
    the exact phrase extracted from the job description.
    """
    name = str(requirement.get('name', '')).strip()
    aliases: list[str] = []

    aliases.extend([str(keyword) for keyword in requirement.get('job_keywords', []) if str(keyword).strip()])

    if name:
        aliases.append(name)

    catalog_config = SKILL_CATALOG.get(name)
    if catalog_config:
        aliases.extend([str(alias) for alias in catalog_config.get('aliases', []) if str(alias).strip()])

    return unique_preserve_order(aliases)


def get_requirement_matches(required_terms: list[dict[str, Any]], resume_text: str) -> tuple[list[str], list[str], dict[str, list[str]]]:
    matched: list[str] = []
    missing: list[str] = []
    matched_keywords: dict[str, list[str]] = {}

    for requirement in required_terms:
        name = requirement.get('name', '')
        match_aliases = get_requirement_match_aliases(requirement)

        hits = find_present_aliases(resume_text, match_aliases)

        if hits:
            matched.append(name)
            matched_keywords[name] = hits
        else:
            missing.append(name)

    return matched, missing, matched_keywords


def score_required_keyword_groups(required_terms: list[dict[str, Any]], resume_text: str, label: str, min_confident_terms: int = 3) -> tuple[int, list[str], list[str], str, str, dict[str, list[str]]]:
    required_terms = [item for index, item in enumerate(required_terms) if item.get('name') and item.get('name') not in [previous.get('name') for previous in required_terms[:index]]]
    matched, missing, matched_keywords = get_requirement_matches(required_terms, resume_text)
    if not required_terms:
        return 70, [], [], f'No specific {label.lower()} were detected in the job description, so this check was scored neutrally.', 'low', {}

    raw_score = len(matched) / len(required_terms) * 100
    confidence = 'high' if len(required_terms) >= min_confident_terms else 'low'
    if confidence == 'low':
        raw_score = min(raw_score, 75 if len(required_terms) == 1 else 85)
    score = clamp(raw_score)
    feedback = f'{len(matched)} of {len(required_terms)} exact {label.lower()} from the job description appear in the resume.'
    if confidence == 'low':
        feedback += f' Extraction confidence is low because only {len(required_terms)} {label.lower()} were detected from the job description.'
    return score, matched, missing, feedback, confidence, matched_keywords

def extract_job_title_variations(job_title: str) -> list[str]:
    base = normalize_for_matching(job_title)
    return [base] if base else []


def clean_job_title_for_display(job_title: str) -> str:
    return re.sub(r'\s+', ' ', (job_title or '').strip())


def score_job_title(job_title: str, resume_text: str) -> tuple[int, list[str], list[str], str]:
    target = clean_job_title_for_display(job_title)
    base = normalize_for_matching(target)
    if not base:
        return 70, [], [], 'No target job title was provided, so this check was scored neutrally.'

    # Strict ATS mode: the exact entered target title should appear in the resume.
    # We normalize punctuation/hyphens, but we do not credit role synonyms here.
    # Example: "Web Developer" must appear as Web Developer; "Software Developer"
    # is human-related, but not an exact ATS title match. Gemini can explain that separately.
    if contains_phrase(resume_text, base):
        return 100, [target], [], f'The exact target job title "{target}" appears in the resume.'

    return 0, [], [target], f'The exact target job title "{target}" was not found in the resume. Add it only if it accurately describes the role you are targeting.'

def get_lines(resume_text: str) -> list[str]:
    return [line.strip() for line in (resume_text or '').splitlines() if line.strip()]


def is_heading_line(line: str) -> bool:
    normalized = normalize(line).strip(':')
    aliases = [alias for group in STANDARD_HEADING_GROUPS.values() for alias in group]
    return normalized in aliases or (line.isupper() and len(line) <= 40 and not EMAIL_REGEX.search(line))


def clean_location_text(line: str) -> str:
    line = re.sub(r'[_•●▪■◆]+', ' ', line or '')
    line = re.sub(r'\s+', ' ', line).strip(' .;|,_-')
    line = re.sub(r'\s+,\s*', ', ', line)
    line = re.sub(r'\bUAE\b', 'UAE', line, flags=re.IGNORECASE)
    return line

def split_contact_line_parts(line: str) -> list[str]:
    """Split one-line contact headers into searchable parts.

    Example:
    Leeds, United Kingdom | +44 7700 900111 | email@example.com
    should let the location detector inspect "Leeds, United Kingdom" alone.
    """
    raw = line or ''
    parts = re.split(r'\s*(?:\||•|·|,?\s+-\s+)\s*', raw)
    cleaned = [clean_location_text(part) for part in parts if clean_location_text(part)]
    return unique_preserve_order(cleaned)

def looks_like_resume_sentence_not_location(line: str) -> bool:
    clean = clean_location_text(line)
    normalized = normalize_for_matching(clean)

    if not clean:
        return True

    # Long text with commas is usually a profile/summary sentence, not a location.
    if len(clean.split()) > 8:
        return True

    if any(term in normalized for term in NON_LOCATION_RESUME_CONTEXT_TERMS):
        return True

    # Reject sentence-like fragments with verbs.
    if any(verb in normalized for verb in RESUME_ACTION_VERBS):
        return True

    # Reject lines that look like skills lists or project summaries.
    if re.search(r'\b(html|css|javascript|typescript|react|node|api|database|testing|debugging)\b', normalized):
        return True

    return False

def location_candidate_score(line: str, contact_section: bool = False) -> int:
    clean = clean_location_text(line)
    normalized = normalize(clean)
    normalized_match = normalize_for_matching(clean)

    if not clean or len(clean) < 3 or len(clean) > 90:
        return -100

    if not re.search(r'[A-Za-z]', clean):
        return -100

    if EMAIL_REGEX.search(clean) or PHONE_REGEX.fullmatch(clean.replace(' ', '')) or URL_REGEX.search(clean):
        return -100

    if is_heading_line(clean):
        return -100

    # Do not treat profile, skills, or project sentences as locations.
    if looks_like_resume_sentence_not_location(clean):
        return -100

    has_known_location = any(hint in normalized for hint in LOCATION_HINTS)
    has_address_term = any(term in normalized for term in LOCATION_ADDRESS_TERMS)

    # Accept concise "City, Country" or "City, State" style lines.
    city_country_like = bool(
        re.fullmatch(
            r'[A-Za-z][A-Za-z .\'-]{1,35},\s*[A-Za-z][A-Za-z .\'-]{1,35}',
            clean,
        )
    )

    # Accept common one-line work preference locations.
    work_preference_like = bool(
        re.fullmatch(
            r'(remote|hybrid|onsite|on-site)(?:\s*[-,|]\s*[A-Za-z][A-Za-z .\'-]{1,35})?',
            normalized_match,
        )
    )

    # A comma alone is not enough. This prevents profile sentences like
    # "REST API integrations, and accessible user experiences" from being detected.
    if not (has_known_location or has_address_term or city_country_like or work_preference_like):
        return -100

    # Avoid guessing company/school locations as the candidate's personal location.
    parts = [part.strip() for part in clean.split(',') if part.strip()]
    if len(parts) >= 2:
        first_part = normalize(parts[0])
        rest_part = normalize(', '.join(parts[1:]))
        first_has_location_or_address = (
            any(hint in first_part for hint in LOCATION_HINTS)
            or any(term in first_part for term in LOCATION_ADDRESS_TERMS)
        )
        rest_has_location = any(hint in rest_part for hint in LOCATION_HINTS)

        if rest_has_location and not first_has_location_or_address:
            company_like_first_part = (
                len(parts[0].split()) <= 4
                and not any(term in first_part for term in ['street', 'road', 'st.', 'avenue', 'lane', 'township', 'district'])
            )
            if company_like_first_part:
                return -40

    score = 0

    if contact_section:
        score += 35

    if has_known_location:
        score += 65

    if has_address_term:
        score += 30

    if city_country_like:
        score += 45

    if work_preference_like:
        score += 45

    if len(clean.split()) <= 5:
        score += 15

    return score

def normalize_phone_candidate(candidate: str) -> str:
    candidate = re.sub(r'[^\d+]', '', candidate or '')
    if candidate.count('+') > 1:
        candidate = candidate.replace('+', '')
    if '+' in candidate and not candidate.startswith('+'):
        candidate = '+' + candidate.replace('+', '')
    return candidate


def phone_candidate_score(candidate: str, line: str, contact_section: bool = False) -> int:
    normalized_phone = normalize_phone_candidate(candidate)
    digits = re.sub(r'\D', '', normalized_phone)
    if len(digits) < 7 or len(digits) > 15:
        return -100
    if EMAIL_REGEX.search(line or '') and candidate in EMAIL_REGEX.search(line or '').group(0):
        return -100
    if re.search(r'\d{4}\s*[\-–—/]\s*\d{4}', line or ''):
        return -80
    score = 0
    if normalized_phone.startswith('+'):
        score += 45
    if contact_section:
        score += 25
    if len(digits) >= 9:
        score += 30
    if re.search(r'(?:phone|mobile|tel|contact|whatsapp)', line or '', flags=re.IGNORECASE):
        score += 20
    if '@' in (line or ''):
        score -= 60
    return score


def extract_phone_number(resume_text: str, lines: list[str]) -> str:
    # Mask emails and URLs before phone matching so numbers inside email usernames such as
    # sanni072006@gmail.com are not mistaken for phone numbers.
    masked_text = EMAIL_REGEX.sub(' ', resume_text or '')
    masked_text = URL_REGEX.sub(' ', masked_text)
    candidates: list[tuple[int, str]] = []

    contact_indices = [index for index, line in enumerate(lines) if normalize(line).strip(':') in STANDARD_HEADING_GROUPS['contact']]
    contact_line_indices: set[int] = set()
    for index in contact_indices:
        contact_line_indices.update(range(index + 1, min(len(lines), index + 10)))

    for index, line in enumerate(lines):
        masked_line = EMAIL_REGEX.sub(' ', line or '')
        masked_line = URL_REGEX.sub(' ', masked_line)
        for match in PHONE_REGEX.finditer(masked_line):
            raw = match.group(0).strip()
            score = phone_candidate_score(raw, masked_line, index in contact_line_indices)
            if score >= 0:
                candidates.append((score, raw))

    for match in PHONE_REGEX.finditer(masked_text):
        raw = match.group(0).strip()
        score = phone_candidate_score(raw, raw, False)
        if score >= 0:
            candidates.append((score, raw))

    if not candidates:
        return ''
    candidates.sort(key=lambda item: item[0], reverse=True)
    return candidates[0][1]

def extract_contact_info(resume_text: str) -> dict[str, Any]:
    lines = get_lines(resume_text)
    email_match = EMAIL_REGEX.search(resume_text or '')
    phone = extract_phone_number(resume_text or '', lines)
    urls = URL_REGEX.findall(resume_text or '')

    scored_candidates: list[tuple[int, str, str]] = []

    contact_indices = [
        index
        for index, line in enumerate(lines)
        if normalize(line).strip(':') in STANDARD_HEADING_GROUPS['contact']
    ]

    for index in contact_indices:
        for offset, line in enumerate(lines[index + 1:index + 9], start=1):
            # Stop when the parser has moved into another section.
            if offset > 1 and is_heading_line(line):
                break

            for part in split_contact_line_parts(line):
                if EMAIL_REGEX.search(part) or PHONE_REGEX.search(part) or URL_REGEX.search(part):
                    continue

                scored_candidates.append((
                    location_candidate_score(part, contact_section=True) - offset,
                    part,
                    'contact',
                ))

            if offset < 8 and index + offset + 1 < len(lines):
                next_line = lines[index + offset + 1]

                if not is_heading_line(next_line):
                    joined = f'{line}, {next_line}'

                    for part in split_contact_line_parts(joined):
                        if EMAIL_REGEX.search(part) or PHONE_REGEX.search(part) or URL_REGEX.search(part):
                            continue

                        scored_candidates.append((
                            location_candidate_score(part, contact_section=True) - offset,
                            part,
                            'contact',
                        ))

    email_or_phone_indices = [
        index
        for index, line in enumerate(lines)
        if EMAIL_REGEX.search(line) or PHONE_REGEX.search(line)
    ]

    for index in email_or_phone_indices:
        contact_line = lines[index]

        # First inspect split parts of the same contact line.
        # Example: "Leeds, United Kingdom | +44... | email..."
        for part in split_contact_line_parts(contact_line):
            if EMAIL_REGEX.search(part) or PHONE_REGEX.search(part) or URL_REGEX.search(part):
                continue

            scored_candidates.append((
                location_candidate_score(part, contact_section=True) + 50,
                part,
                'near_contact',
            ))

        # Then inspect nearby lines.
        start = max(0, index - 5)
        end = min(len(lines), index + 6)

        for nearby_index in range(start, end):
            if nearby_index == index:
                continue

            line = lines[nearby_index]

            for part in split_contact_line_parts(line):
                if EMAIL_REGEX.search(part) or PHONE_REGEX.search(part) or URL_REGEX.search(part):
                    continue

                scored_candidates.append((
                    location_candidate_score(part, contact_section=True) + 35 - abs(index - nearby_index),
                    part,
                    'near_contact',
                ))

    for line in lines[:35]:
        for part in split_contact_line_parts(line):
            if EMAIL_REGEX.search(part) or PHONE_REGEX.search(part) or URL_REGEX.search(part):
                continue

            scored_candidates.append((
                location_candidate_score(part, contact_section=False),
                part,
                'document',
            ))

    scored_candidates = [
        (score, clean_location_text(line), source)
        for score, line, source in scored_candidates
        if score >= 55
    ]

    scored_candidates.sort(key=lambda item: item[0], reverse=True)

    contact_candidates = [
        item
        for item in scored_candidates
        if item[2] in {'contact', 'near_contact'}
    ]

    location = ''

    if contact_candidates:
        location = contact_candidates[0][1]
    else:
        conservative_candidates = [
            item
            for item in scored_candidates
            if (
                item[0] >= 80
                and len(item[1].split()) <= 6
                and not any(
                    term in normalize(item[1])
                    for term in ['company', 'university', 'academy', 'hotel', 'restaurant']
                )
            )
        ]

        if conservative_candidates:
            location = conservative_candidates[0][1]

    preferred_pool = contact_candidates

    for score, candidate, source in preferred_pool[:8]:
        normalized_candidate = normalize(candidate)

        has_location_hint = any(
            hint in normalized_candidate
            for hint in [
                'leeds',
                'london',
                'manchester',
                'united kingdom',
                'uk',
                'abu dhabi',
                'dubai',
                'uae',
                'myanmar',
                'singapore',
                'bangkok',
                'taunggyi',
            ]
        )

        has_company_hint = any(
            term in normalized_candidate
            for term in ['class2sass', 'sofitel', 'rixos']
        )

        if has_location_hint and not has_company_hint and len(candidate.split()) <= 9:
            location = candidate
            break

    return {
        'email': email_match.group(0) if email_match else '',
        'phone': phone,
        'location': location,
        'location_status': 'detected' if location else 'not_detected',
        'links': urls[:5],
    }

def score_contact_info(contact_info: dict[str, Any]) -> tuple[int, list[dict[str, Any]], str]:
    checks = [
        {'name': 'Email detected', 'passed': bool(contact_info.get('email')), 'weight': 30, 'feedback': 'Email address is present.' if contact_info.get('email') else 'Add a professional email address.'},
        {'name': 'Phone detected', 'passed': bool(contact_info.get('phone')), 'weight': 30, 'feedback': 'Phone number is present.' if contact_info.get('phone') else 'Add a phone number recruiters can call.'},
        {'name': 'Location detected', 'passed': bool(contact_info.get('location')), 'weight': 25, 'feedback': 'Location or work preference is present.' if contact_info.get('location') else 'Location was not detected. Add city/country, remote, hybrid, or relocation preference if you want recruiters to see it.'},
        {'name': 'Professional link detected', 'passed': bool(contact_info.get('links')), 'weight': 15, 'feedback': 'Professional link is present.' if contact_info.get('links') else 'Add LinkedIn, portfolio, GitHub, or professional profile if relevant.'},
    ]
    score = sum(check['weight'] for check in checks if check['passed'])
    feedback = 'Recruiter contact details are easy to find.' if score >= 80 else 'Add clear contact details near the top of the resume. Do not let the system guess missing location details.'
    return clamp(score), checks, feedback


def find_headings(resume_text: str) -> dict[str, bool]:
    lines = [normalize(line).strip(':') for line in get_lines(resume_text)]
    found: dict[str, bool] = {}
    for group, aliases in STANDARD_HEADING_GROUPS.items():
        group_found = False
        for line in lines:
            if len(line) > 60:
                continue
            if any(line == alias or line.startswith(alias + ' ') for alias in aliases):
                group_found = True
                break
        found[group] = group_found
    return found


def heading_positions(resume_text: str) -> dict[str, int | None]:
    lines = [normalize(line).strip(':') for line in get_lines(resume_text)]
    positions: dict[str, int | None] = {}
    for group, aliases in STANDARD_HEADING_GROUPS.items():
        positions[group] = None
        for index, line in enumerate(lines):
            if len(line) <= 60 and any(line == alias or line.startswith(alias + ' ') for alias in aliases):
                positions[group] = index
                break
    return positions


def extract_required_years(job_description: str) -> dict[str, Any]:
    jd = normalize_for_matching(job_description).replace('years of experience', 'years')
    range_match = re.search(r'(?:at least|minimum|min)?\s*(\d+)\s*(?:-|to|\s+)\s*(\d+)\+?\s*(?:years|year|yrs|yr)', jd)
    if range_match:
        lower = int(range_match.group(1))
        upper = int(range_match.group(2))
        return {'minimum_years': lower, 'preferred_years': upper, 'raw': range_match.group(0)}
    at_least_match = re.search(r'(?:at least|minimum|min)\s*(\d+)\+?\s*(?:years|year|yrs|yr)', jd)
    if at_least_match:
        years = int(at_least_match.group(1))
        return {'minimum_years': years, 'preferred_years': years, 'raw': at_least_match.group(0)}
    matches = re.findall(r'(\d+)\+?\s*(?:years|year|yrs|yr)', jd)
    if not matches:
        return {'minimum_years': 0, 'preferred_years': 0, 'raw': ''}
    years = max(int(match) for match in matches[:5])
    return {'minimum_years': years, 'preferred_years': years, 'raw': f'{years} years'}


def clean_text_for_context(text: str) -> str:
    return re.sub(r'\s+', ' ', text or '').strip()


def parse_date_fragment(fragment: str) -> tuple[int, int] | None:
    fragment = normalize_for_matching(fragment).replace(',', ' ')
    if fragment in {'present', 'current', 'now'}:
        now = datetime.utcnow()
        return now.year, now.month
    year_match = re.search(r'(19|20)\d{2}', fragment)
    if not year_match:
        return None
    year = int(year_match.group(0))
    month = 1
    for month_name, month_num in MONTHS.items():
        if re.search(rf'\b{re.escape(month_name)}\b', fragment):
            month = month_num
            break
    return year, month


def month_index(year: int, month: int) -> int:
    return year * 12 + month


def extract_date_ranges(resume_text: str) -> list[dict[str, Any]]:
    date_pattern = r'(?:(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s*)?(?:19|20)\d{2}|(?:19|20)\d{2}\s*(?:(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?))?'
    range_pattern = re.compile(
        rf'({date_pattern})\s*(?:-|to|through|until|/|--|–|—)\s*((?:present|current|now)|{date_pattern})',
        re.IGNORECASE,
    )
    ranges = []
    for match in range_pattern.finditer(resume_text or ''):
        start = parse_date_fragment(match.group(1))
        end = parse_date_fragment(match.group(2))
        if not start or not end:
            continue
        start_index = month_index(*start)
        end_index = month_index(*end)
        if end_index < start_index:
            continue
        duration = max(1, end_index - start_index + 1)
        if duration > 600:
            continue
        context_start = max(0, match.start() - 180)
        context_end = min(len(resume_text or ''), match.end() + 180)
        ranges.append({
            'raw': match.group(0),
            'start': {'year': start[0], 'month': start[1]},
            'end': {'year': end[0], 'month': end[1]},
            'duration_months': duration,
            'start_char': match.start(),
            'end_char': match.end(),
            'context': clean_text_for_context((resume_text or '')[context_start:context_end]),
        })
    return ranges[:20]


def estimate_total_experience_months(date_ranges: list[dict[str, Any]]) -> int:
    if not date_ranges:
        return 0
    intervals = sorted(
        (month_index(item['start']['year'], item['start']['month']), month_index(item['end']['year'], item['end']['month']))
        for item in date_ranges
    )
    merged: list[list[int]] = []
    for start, end in intervals:
        if not merged or start > merged[-1][1] + 1:
            merged.append([start, end])
        else:
            merged[-1][1] = max(merged[-1][1], end)
    return sum(end - start + 1 for start, end in merged)


def date_format_issues(date_ranges: list[dict[str, Any]]) -> list[str]:
    issues: list[str] = []
    for item in date_ranges:
        raw = item.get('raw', '')
        raw_norm = normalize_for_matching(raw)
        if 'from ' in raw_norm or re.search(r'20\d{2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)', raw_norm):
            issues.append('Use a recruiter-friendly date format such as Jan 2024 - Present or 02/2022 - 04/2023.')
            break
    return issues


def extract_company_candidates(resume_text: str) -> list[str]:
    candidates: list[str] = []
    for line in get_lines(resume_text):
        normalized_line = normalize(line)
        if len(line) > 120 or len(line) < 3:
            continue
        if any(re.search(rf'\b{re.escape(suffix)}\b', normalized_line) for suffix in COMPANY_SUFFIXES):
            candidates.append(line)
        elif re.search(r'\b(sofitel|rixos|marina|corniche|restaurant|hotel|resort)\b', normalized_line):
            candidates.append(line)
    return unique_preserve_order(candidates)[:10]


def extract_education_signals(resume_text: str) -> dict[str, Any]:
    normalized_text = normalize_for_matching(resume_text)
    degrees = sorted({term for term in DEGREE_TERMS if re.search(rf'\b{re.escape(normalize_for_matching(term))}\b', normalized_text)})
    certifications = sorted({term for term in CERTIFICATION_TERMS if contains_phrase(resume_text, term)})
    institutions = []
    for line in get_lines(resume_text):
        normalized_line = normalize(line)
        if any(term in normalized_line for term in INSTITUTION_TERMS):
            institutions.append(line.strip())
    return {'degrees': degrees[:8], 'certifications': certifications[:8], 'institutions': institutions[:8]}



def has_project_only_experience(resume_text: str) -> bool:
    normalized = normalize_for_matching(resume_text)
    return bool(re.search(r'\b(project experience|projects|portfolio)\b', normalized)) and not bool(re.search(r'\b(work experience|professional experience|employment history|career history)\b', normalized))


def professional_experience_confidence(resume_text: str) -> str:
    normalized = normalize_for_matching(resume_text)
    headings = find_headings(resume_text)
    companies = extract_company_candidates(resume_text)
    has_work_heading = bool(headings.get('experience')) or bool(re.search(r'\b(work experience|professional experience|employment history|career history)\b', normalized))
    has_project_heading = has_project_only_experience(resume_text)
    has_company_or_role = bool(companies) or bool(re.search(r'\b(company|ltd|limited|inc|corp|hotel|restaurant|agency|bank|startup)\b', normalized))

    if has_work_heading and has_company_or_role:
        return 'high'
    if has_work_heading:
        return 'medium'
    if has_project_heading:
        return 'project_only'
    return 'low'

def extract_explicit_experience_years(resume_text: str) -> list[dict[str, Any]]:
    normalized = normalize_for_matching(resume_text)
    patterns = [
        r'(?:over|more than|at least|minimum|min)\s+(\d+(?:\.\d+)?)\+?\s*(?:years|year|yrs|yr)\s+(?:of\s+)?(?:work\s+)?experience',
        r'(\d+(?:\.\d+)?)\+?\s*(?:years|year|yrs|yr)\s+(?:of\s+)?(?:work\s+)?experience',
        r'experience\s+(?:of\s+)?(\d+(?:\.\d+)?)\+?\s*(?:years|year|yrs|yr)',
    ]
    matches: list[dict[str, Any]] = []
    for pattern in patterns:
        for match in re.finditer(pattern, normalized, flags=re.IGNORECASE):
            try:
                years = float(match.group(1))
            except (TypeError, ValueError):
                continue
            matches.append({'years': years, 'raw': match.group(0)})
    return matches[:5]


def professional_date_ranges(resume_text: str, date_ranges: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not date_ranges:
        return []
    normalized_resume = normalize_for_matching(resume_text)
    has_professional_heading = bool(re.search(r'\b(work experience|professional experience|employment history|career history|previous experience|experience)\b', normalized_resume))
    if not has_professional_heading:
        return []

    professional_keywords = [
        'work experience', 'professional experience', 'employment history', 'career history', 'previous experience',
        'company', 'ltd', 'limited', 'inc', 'corp', 'corporation', 'hotel', 'restaurant', 'agency', 'bank',
        'developer', 'engineer', 'designer', 'manager', 'waiter', 'server', 'assistant', 'analyst', 'consultant',
        'editor', 'internship', 'intern', 'remote', 'onsite', 'hybrid',
    ]
    education_project_keywords = ['education', 'university', 'college', 'academy', 'school', 'diploma', 'degree', 'project experience', 'projects', 'bachelor', 'master',]

    filtered: list[dict[str, Any]] = []
    for item in date_ranges:
        context = normalize_for_matching(item.get('context', ''))
        if any(keyword in context for keyword in professional_keywords):
            # Do not reject a range merely because an education word appears in a multi-column
            # extraction context; only reject if the context looks education/project-only.
            professional_hits = sum(1 for keyword in professional_keywords if keyword in context)
            education_hits = sum(1 for keyword in education_project_keywords if keyword in context)
            if professional_hits >= education_hits or 'work experience' in context or 'professional experience' in context:
                filtered.append(item)
    return filtered


def score_required_experience(resume_text: str, job_description: str) -> tuple[int, list[dict[str, Any]], dict[str, Any], str]:
    all_date_ranges = extract_date_ranges(resume_text)
    date_ranges = professional_date_ranges(resume_text, all_date_ranges)
    total_months = estimate_total_experience_months(date_ranges)
    total_years = round(total_months / 12, 1)
    required = extract_required_years(job_description)
    minimum_years = required['minimum_years']
    preferred_years = required['preferred_years']
    requirement_detected = minimum_years > 0
    experience_confidence = professional_experience_confidence(resume_text)
    explicit_years = extract_explicit_experience_years(resume_text)
    max_explicit_years = max((item['years'] for item in explicit_years), default=0)

    if not requirement_detected:
        # Do not check or score experience when the job description does not explicitly
        # mention a required/preferred number of years. The UI will hide this checklist card.
        duration_score = 100
        feedback = 'No exact experience-year requirement was detected in the job description, so this ATS check was not applied.'
        matched: list[str] = []
        missing: list[str] = []
    else:
        explicit_match = max_explicit_years >= minimum_years
        date_match = total_months >= minimum_years * 12
        preferred_match = bool(preferred_years and (max_explicit_years >= preferred_years or total_months >= preferred_years * 12))

        if preferred_match:
            duration_score = 100
        elif explicit_match:
            duration_score = 95
        elif date_match:
            duration_score = 90
        elif total_months > 0:
            duration_score = clamp(total_months / max(1, minimum_years * 12) * 75)
        else:
            duration_score = 20

        if experience_confidence == 'project_only':
            duration_score = min(duration_score, 55)
            feedback = 'The job description requires professional work experience, but the resume mainly shows project experience. Add a clear work/internship role and dates if available.'
        elif experience_confidence == 'low':
            duration_score = min(duration_score, 50)
            feedback = 'The job description requires professional work experience, but a clear work-history section was not detected.'
        elif explicit_match:
            feedback = f'The resume explicitly states {max_explicit_years:g}+ years or similar experience, matching the detected requirement of {minimum_years}+ years.'
        elif date_match:
            feedback = f'Professional date ranges estimate {total_years} years of experience against a detected requirement of {minimum_years}+ years.'
        else:
            feedback = f'The resume does not clearly show the detected requirement of {minimum_years}+ years of professional experience.'

        matched = []
        missing = []
        if duration_score >= 80:
            if max_explicit_years >= minimum_years:
                matched.append(f'Explicit {max_explicit_years:g}+ years experience')
            elif total_months:
                matched.append(f'{total_years} years from professional dates')
        else:
            missing.append(f'{minimum_years}+ years of professional experience')
        if not date_ranges and not explicit_years:
            missing.append('Clear professional work-history dates or explicit years')
        if experience_confidence in {'project_only', 'low'}:
            missing.append('Clear professional work experience section')

    details = {
        'requirement_detected': requirement_detected,
        'all_date_ranges': all_date_ranges,
        'date_ranges': date_ranges,
        'explicit_experience_years': explicit_years,
        'estimated_total_experience_months': total_months,
        'estimated_total_experience_years': total_years,
        'required_years_from_job_description': required,
        'professional_experience_confidence': experience_confidence,
        'matching_mode': 'strict_required_years_with_professional_dates_or_explicit_years',
    }
    checks = [{
        'name': 'Experience years',
        'score': duration_score,
        'feedback': feedback,
        'matched': matched,
        'missing': unique_preserve_order(missing),
        'applied': requirement_detected,
    }]
    return clamp(duration_score), checks, details, feedback


def extract_education_context_text(job_description: str) -> str:
    """Return only job-description sentences that actually discuss education.

    This deliberately ignores generic words like "education" unless they appear in
    an education/background requirement context. The ATS education check should be
    applied only when the job description asks for a level or field of study.
    """
    sentences = re.split(r'[\n.;]+', job_description or '')
    education_triggers = [
        'high school', 'secondary school', 'diploma', 'degree', 'bachelor', 'bachelor of', 'master',
        'bsc', 'ba ', 'bs ', 'msc', 'ma ', 'background in', 'field of study',
        'major in', 'qualification', 'educational background', 'academic background',
    ]
    relevant = [sentence.strip() for sentence in sentences if any(trigger in normalize_for_matching(sentence) for trigger in education_triggers)]
    return ' '.join(relevant)


def extract_resume_education_text(resume_text: str) -> str:
    """Extract the Education section from a resume for strict education matching.

    We should not satisfy an education requirement because the word appears in a
    project, profile, or job description-like paragraph. When the resume has an
    Education heading, match education requirements against that section only.
    """
    lines = get_lines(resume_text)
    if not lines:
        return ''

    start_index: int | None = None
    stop_groups = {'experience', 'skills', 'summary', 'projects', 'certifications', 'contact'}
    stop_aliases = {
        alias
        for group, aliases in STANDARD_HEADING_GROUPS.items()
        if group in stop_groups
        for alias in aliases
    }
    stop_aliases.update({
        'work experience', 'professional experience', 'employment history', 'projects',
        'project experience', 'skills', 'technical skills', 'tools', 'tools and platforms',
        'tools & platforms', 'additional skills', 'certifications', 'certificates',
        'contact', 'profile', 'summary', 'about me', 'other', 'previous experience',
    })

    for index, line in enumerate(lines):
        normalized = normalize(line).strip(':_- ')
        if normalized in STANDARD_HEADING_GROUPS['education'] or normalized == 'education':
            start_index = index + 1
            break

    if start_index is None:
        # Fallback: collect lines that strongly look like education lines. This avoids
        # using the full resume and accidentally matching unrelated terms.
        candidates = []
        education_markers = DEGREE_TERMS + ['high school', 'secondary school', 'diploma', 'bachelor', 'university', 'college', 'academy', 'institute']
        for line in lines:
            normalized = normalize_for_matching(line)
            if any(contains_phrase(line, marker) for marker in education_markers):
                candidates.append(line)
        return '\n'.join(candidates)

    section_lines: list[str] = []
    for line in lines[start_index:]:
        normalized = normalize(line).strip(':_- ')
        if normalized in stop_aliases or (is_heading_line(line) and normalized not in {'', 'education'}):
            break
        section_lines.append(line)
    return '\n'.join(section_lines).strip()


def extract_field_alternatives_from_education_context(education_text: str) -> list[dict[str, Any]]:
    """Extract exact field-of-study requirements from education-related JD text.

    Examples:
    - "Bachelor degree in Computer Science or IT" -> one alternative group
    - "Background in Education, Psychology, Communications" -> one alternative group
    """
    if not education_text:
        return []

    fields: dict[str, list[str]] = {
        'Information Technology': ['information technology'],
        'IT': ['IT'],
        'Computer Science': ['computer science'],
        'Software Engineering': ['software engineering'],
        'Web Design': ['web design', 'web design and development'],
        'Education': ['education'],
        'Psychology': ['psychology'],
        'Communications': ['communications', 'communication'],
        'Learning Design': ['learning design'],
        'Instructional Design': ['instructional design'],
        'Business': ['business', 'business administration'],
        'Marketing': ['marketing'],
        'Accounting': ['accounting'],
        'Finance': ['finance'],
        'Hospitality': ['hospitality'],
        'Nursing': ['nursing'],
        'Engineering': ['engineering'],
        'Design': ['design'],
    }

    text_norm = normalize_for_matching(education_text)
    # Only extract fields when the sentence explicitly asks for a background/degree/field.
    field_requirement_context = bool(
        re.search(
           r'\b(background in|degree in|diploma in|bachelor(?:\'s)?(?: degree)? in|master(?:\'s)?(?: degree)? in|field of study|major in)\b',
           text_norm,
        )
        or re.search(
            r'\b(computer science|information technology|software engineering|web design|business|marketing|accounting|finance|hospitality|nursing|engineering|design)\s+degree\b',
           text_norm,
        )
    )

    if not field_requirement_context:
        return []
 
    matched_fields: list[dict[str, Any]] = []
    for name, aliases in fields.items():
        hits: list[str] = []
        for alias in aliases:
            if alias == 'IT':
                if re.search(r'\bIT\b', education_text or ''):
                    hits.append('IT')
            elif contains_phrase(education_text, alias):
                hits.append(alias)
        if hits:
            matched_fields.append({'name': name, 'job_keywords': unique_preserve_order(hits), 'source': 'education_field'})

    if not matched_fields:
        return []

    # Treat multiple fields in one education sentence as alternatives. If the JD says
    # "Computer Science or IT", one matching field in the Education section satisfies it.
    group_name = ' or '.join(item['name'] for item in matched_fields[:6])
    group_aliases: list[str] = []
    for item in matched_fields:
        group_aliases.extend(item.get('job_keywords', []))
    return [{'name': group_name, 'job_keywords': unique_preserve_order(group_aliases), 'source': 'education_field_alternative_group'}]


def extract_education_requirements_from_jd(job_description: str) -> list[dict[str, Any]]:
    education_text = extract_education_context_text(job_description)
    requirements: list[dict[str, Any]] = []

    def add(name: str, aliases: list[str]) -> None:
        present_aliases = find_present_aliases(education_text, aliases)
        if present_aliases:
            requirements.append({'name': name, 'job_keywords': present_aliases, 'source': 'education_level'})

    # Only these education levels are checked in ATS, per CareerLens product rule.
    add('High School', ['high school', 'secondary school', 'ged'])
    add('Diploma', ['diploma', 'higher diploma'])
    add('Degree', ['degree'])
    add('Bachelor Degree', ["bachelor's degree", 'bachelor degree', 'bachelors degree', 'bachelor'])
    add('Master Degree', ["master's degree", 'master degree', 'masters degree', 'master'])

    requirements.extend(extract_field_alternatives_from_education_context(education_text))
    return merge_requirement_lists([], requirements)


def education_requirement_matches(requirements: list[dict[str, Any]], resume_education_text: str) -> tuple[list[str], list[str], dict[str, list[str]]]:
    matched: list[str] = []
    missing: list[str] = []
    matched_keywords: dict[str, list[str]] = {}

    # Add deterministic degree abbreviations on the resume side. This lets BSc/BSc
    # (Hons) satisfy Bachelor Degree, while still requiring exact field alignment.
    education_text_for_levels = resume_education_text
    if re.search(r'\b(bsc|b\.sc|bs|b\.s|ba|b\.a|bachelor)\b', normalize_for_matching(resume_education_text)):
        education_text_for_levels += '\nBachelor Degree\nDegree'
    if re.search(r'\b(msc|m\.sc|ms|m\.s|ma|m\.a|master)\b', normalize_for_matching(resume_education_text)):
        education_text_for_levels += '\nMaster Degree\nDegree'
    if contains_phrase(resume_education_text, 'diploma'):
        education_text_for_levels += '\nDiploma'
    if contains_phrase(resume_education_text, 'high school') or contains_phrase(resume_education_text, 'secondary school'):
        education_text_for_levels += '\nHigh School'

    for requirement in requirements:
        name = requirement.get('name', '')
        aliases = requirement.get('job_keywords', []) or [name]
        source = requirement.get('source', '')
        text_to_check = education_text_for_levels if source == 'education_level' else resume_education_text
        hits = find_present_aliases(text_to_check, aliases)

        # For generic level requirements, canonical generated tokens can satisfy the check.
        if not hits and source == 'education_level':
            if name == 'Bachelor Degree' and contains_phrase(education_text_for_levels, 'Bachelor Degree'):
                hits = ['Bachelor Degree']
            elif name == 'Master Degree' and contains_phrase(education_text_for_levels, 'Master Degree'):
                hits = ['Master Degree']
            elif name == 'Degree' and contains_phrase(education_text_for_levels, 'Degree'):
                hits = ['Degree']
            elif name == 'Diploma' and contains_phrase(education_text_for_levels, 'Diploma'):
                hits = ['Diploma']
            elif name == 'High School' and contains_phrase(education_text_for_levels, 'High School'):
                hits = ['High School']

        if hits:
            matched.append(name)
            matched_keywords[name] = unique_preserve_order(hits)
        else:
            missing.append(name)

    return unique_preserve_order(matched), unique_preserve_order(missing), matched_keywords


def score_education_requirements(resume_text: str, job_description: str) -> tuple[int, list[dict[str, Any]], dict[str, Any], str]:
    education = extract_education_signals(resume_text)
    requirements = extract_education_requirements_from_jd(job_description)
    requirement_detected = bool(requirements)
    resume_education_text = extract_resume_education_text(resume_text)

    if not requirement_detected:
        score = 100
        feedback = 'No diploma, degree, bachelor, master, high-school, or field-of-study requirement was detected in the job description, so this ATS check was not applied.'
        matched: list[str] = []
        missing: list[str] = []
        matched_keywords: dict[str, list[str]] = {}
    elif not resume_education_text:
        score = 0
        matched = []
        missing = [item.get('name', '') for item in requirements if item.get('name')]
        matched_keywords = {}
        feedback = 'The job description includes education requirements, but no clear Education section was detected in the resume.'
    else:
        matched, missing, matched_keywords = education_requirement_matches(requirements, resume_education_text)
        score = clamp(len(matched) / max(1, len(requirements)) * 100)
        if matched and not missing:
            feedback = 'Education requirements from the job description align with the resume Education section.'
        elif matched:
            feedback = f'{len(matched)} of {len(requirements)} education requirements align with the resume Education section.'
        else:
            feedback = 'Education requirements from the job description were not clearly found in the resume Education section.'

    checks = [{
        'name': 'Education match',
        'score': score,
        'feedback': feedback,
        'matched': matched,
        'missing': unique_preserve_order(missing),
        'applied': requirement_detected,
    }]
    details = {
        'requirement_detected': requirement_detected,
        'education': education,
        'resume_education_text': resume_education_text,
        'required_education_terms': [item['name'] for item in requirements],
        'matched_education_terms': matched,
        'missing_education_terms': unique_preserve_order(missing),
        'exact_job_keywords': {item['name']: item.get('job_keywords', []) for item in requirements},
        'matched_exact_keywords': matched_keywords,
        'matching_mode': 'strict_education_section_level_and_field_matching',
    }
    return score, checks, details, feedback


def extract_industry_requirements(job_description: str) -> list[dict[str, Any]]:
    requirements: list[dict[str, Any]] = []
    for name, aliases in INDUSTRY_REQUIREMENTS.items():
        job_keywords = find_present_aliases(job_description, aliases)
        if job_keywords:
            requirements.append({'name': name, 'job_keywords': job_keywords, 'source': 'catalog_phrase'})

    dynamic = get_dynamic_requirements(job_description)
    dynamic_industry = clean_requirement_items(dynamic.get('industry', []), category='industry')
    required = merge_requirement_lists(requirements, dynamic_industry)
    return clean_requirement_items(required, category='industry')


def score_industry_keywords(resume_text: str, job_description: str) -> tuple[int, list[dict[str, Any]], dict[str, Any], str]:
    required = extract_industry_requirements(job_description)
    matched: list[str] = []
    missing: list[str] = []
    matched_keywords: dict[str, list[str]] = {}

    for item in required:
        hits = find_present_aliases(resume_text, item.get('job_keywords', []))
        if hits:
            matched.append(item['name'])
            matched_keywords[item['name']] = hits
        else:
            missing.append(item['name'])

    if required:
        score = clamp(len(matched) / len(required) * 100)
        feedback = f'{len(matched)} of {len(required)} exact important job-description phrases appear in the resume.'
    else:
        score = 70
        feedback = 'No specific industry phrase group was detected in the job description, so this check was scored neutrally.'

    required_names = [item['name'] for item in required]
    checks = [{
        'name': 'Industry keywords and important phrases',
        'score': score,
        'feedback': feedback,
        'matched': matched,
        'missing': missing,
    }]
    details = {
        'required_industry_terms': required_names,
        'matched_industry_terms': matched,
        'missing_industry_terms': missing,
        'exact_job_keywords': {item['name']: item.get('job_keywords', []) for item in required},
        'matched_exact_keywords': matched_keywords,
    }
    return score, checks, details, feedback

def score_hard_skills(resume_text: str, job_description: str) -> tuple[int, list[dict[str, Any]], dict[str, Any], str]:
    catalog_required = clean_requirement_items(
        extract_catalog_requirements(job_description, 'hard'),
        category='hard',
    )
    dynamic = get_dynamic_requirements(job_description)
    dynamic_required = clean_requirement_items(dynamic.get('hard', []), category='hard')
    required = merge_requirement_lists(catalog_required, dynamic_required)
    required = clean_requirement_items(required, category='hard')

    score, matched, missing, feedback, confidence, matched_keywords = score_required_keyword_groups(required, resume_text, 'hard skills', min_confident_terms=5)
    checks = [{
        'name': 'Hard skills',
        'score': score,
        'feedback': feedback,
        'matched': matched,
        'missing': missing,
    }]
    details = {
        'required_hard_skills': [item['name'] for item in required],
        'matched_hard_skills': matched,
        'missing_hard_skills': missing,
        'catalog_hard_skills': [item['name'] for item in catalog_required],
        'dynamic_hard_skills': [item['name'] for item in dynamic_required],
        'extraction_confidence': confidence,
        'exact_job_keywords': {item['name']: item.get('job_keywords', []) for item in required},
        'matched_exact_keywords': matched_keywords,
        'requirement_sources': {item['name']: item.get('source', 'catalog') for item in required},
        'matching_mode': 'catalog_regex_dynamic_phrase_quality_v8',
        'feedback': feedback,
    }
    
    return score, checks, details, feedback


def score_soft_skills(resume_text: str, job_description: str) -> tuple[int, list[dict[str, Any]], dict[str, Any], str]:
    catalog_required = clean_requirement_items(
        extract_catalog_requirements(job_description, 'soft'),
        category='soft',
    )
    dynamic = get_dynamic_requirements(job_description)
    dynamic_required = clean_requirement_items(dynamic.get('soft', []), category='soft')
    required = merge_requirement_lists(catalog_required, dynamic_required)
    required = clean_requirement_items(required, category='soft')

    score, matched, missing, feedback, confidence, matched_keywords = score_required_keyword_groups(required, resume_text, 'soft skills', min_confident_terms=4)
    checks = [{
        'name': 'Soft skills',
        'score': score,
        'feedback': feedback,
        'matched': matched,
        'missing': missing,
    }]
    details = {
        'required_soft_skills': [item['name'] for item in required],
        'matched_soft_skills': matched,
        'missing_soft_skills': missing,
        'catalog_soft_skills': [item['name'] for item in catalog_required],
        'dynamic_soft_skills': [item['name'] for item in dynamic_required],
        'extraction_confidence': confidence,
        'exact_job_keywords': {item['name']: item.get('job_keywords', []) for item in required},
        'matched_exact_keywords': matched_keywords,
        'requirement_sources': {item['name']: item.get('source', 'catalog') for item in required},
        'matching_mode': 'catalog_regex_dynamic_phrase_quality_v8',
        'feedback': feedback,
}
    return score, checks, details, feedback


def detect_layout_warnings(resume_text: str, headings: dict[str, bool], positions: dict[str, int | None], parser_metadata: dict[str, Any]) -> list[str]:
    warnings = list(parser_metadata.get('warnings', []) or [])
    lines = get_lines(resume_text)
    exp_pos = positions.get('experience')
    edu_pos = positions.get('education')
    contact_pos = positions.get('contact')

    date_line_positions = [index for index, line in enumerate(lines[:40]) if re.search(r'(19|20)\d{2}', line)]
    if exp_pos is not None and any(index < exp_pos for index in date_line_positions):
        warnings.append('Some work-history dates appear before the Work Experience heading. This can happen with multi-column resumes and may confuse parsers.')
    if edu_pos is not None and exp_pos is not None and edu_pos < exp_pos and any(index < exp_pos for index in date_line_positions):
        warnings.append('Work experience content may be appearing under or before the Education section in extracted text. Consider a clearer one-column order.')
    if contact_pos is not None and contact_pos > 20:
        warnings.append('Contact details appear later in the parsed text. Keep contact information at the top in a simple layout.')
    if headings.get('skills') and headings.get('experience') and headings.get('education'):
        pass
    else:
        warnings.append('Use standard section headings such as Work Experience, Education, and Skills.')
    return unique_preserve_order(warnings)


def score_ats_readability(resume_text: str, parser_metadata: dict[str, Any], file_type: str, contact_info: dict[str, Any]) -> tuple[int, list[dict[str, Any]], dict[str, Any], str]:
    supported = file_type.lower().replace('.', '') in {'pdf', 'docx'}
    headings = find_headings(resume_text)
    positions = heading_positions(resume_text)
    required_heading_score = clamp(sum(1 for key in ['experience', 'education', 'skills'] if headings.get(key)) / 3 * 100)

    parser_quality = parser_metadata.get('parser_quality', 'good')
    text_count = parser_metadata.get('text_character_count', len(resume_text)) or len(resume_text)
    image_count = parser_metadata.get('image_count', 0) or 0
    table_count = parser_metadata.get('table_count', 0) or 0
    drawing_count = parser_metadata.get('drawing_count', 0) or 0

    if parser_quality == 'good' and text_count >= 500:
        parser_score = 92
    elif parser_quality == 'medium':
        parser_score = 72
    elif parser_quality == 'poor':
        parser_score = 35
    else:
        parser_score = 20

    if image_count > 5:
        parser_score = min(parser_score, 65)
    if table_count > 4:
        parser_score = min(parser_score, 70)
    if drawing_count > 15:
        parser_score = min(parser_score, 72)

    contact_score, contact_checks, contact_feedback = score_contact_info(contact_info)
    date_ranges = extract_date_ranges(resume_text)
    date_score = 90 if date_ranges else 35
    companies = extract_company_candidates(resume_text)
    employer_score = 90 if companies else 45

    layout_simplicity = 90
    warnings = detect_layout_warnings(resume_text, headings, positions, parser_metadata)
    if warnings:
        layout_simplicity -= min(35, len(warnings) * 10)
    if image_count or table_count or drawing_count:
        layout_simplicity -= min(25, image_count * 4 + table_count * 5 + drawing_count * 1)
    layout_simplicity = clamp(layout_simplicity)

    file_type_score = 100 if supported else 0
    score = clamp(
        file_type_score * 0.15
        + parser_score * 0.20
        + required_heading_score * 0.20
        + contact_score * 0.20
        + date_score * 0.10
        + layout_simplicity * 0.10
        + employer_score * 0.05
    )

    checks = [
        {'name': 'File type', 'score': file_type_score, 'feedback': 'Supported file type.' if supported else 'Use PDF or DOCX only.'},
        {'name': 'Text readability / parser quality', 'score': parser_score, 'feedback': 'Selectable text extraction looks reliable.' if parser_score >= 80 else 'Avoid scanned resumes, heavy graphics, charts, and hidden text boxes.'},
        {'name': 'Standard headings', 'score': required_heading_score, 'feedback': 'Standard sections are present.' if required_heading_score >= 80 else 'Use headings like Work Experience, Education, and Skills.'},
        {'name': 'Contact info detection', 'score': contact_score, 'feedback': contact_feedback, 'checks': contact_checks},
        {'name': 'Date parsing', 'score': date_score, 'feedback': 'Work-history dates were detected.' if date_ranges else 'Add clear dates for each role.'},
        {'name': 'Layout simplicity', 'score': layout_simplicity, 'feedback': 'Layout looks parser-friendly.' if layout_simplicity >= 80 else 'A simpler one-column layout would improve parser reliability.'},
    ]
    details = {
        'headings_detected': headings,
        'heading_positions': positions,
        'parser_metadata': parser_metadata,
        'warnings': warnings,
        'contact_info': contact_info,
        'date_ranges': date_ranges,
        'employer_candidates': companies,
    }
    # Do not call a resume "Excellent" when parser warnings exist. A single warning
    # such as late contact information should usually cap the result at Good.
    if len(warnings) >= 3:
        score = min(score, 78)
    elif len(warnings) == 2:
        score = min(score, 84)
    elif len(warnings) == 1:
        score = min(score, 86)
    if any('Contact details appear later' in warning for warning in warnings):
        score = min(score, 84)

    if score >= 90:
        feedback = 'The resume is very readable for ATS parsing.'
    elif score >= 70:
        feedback = 'The resume is mostly readable, but layout or parsing improvements would help.'
    elif score >= 50:
        feedback = 'The resume has readability issues that may affect ATS parsing.'
    else:
        feedback = 'Use a clean one-column PDF or DOCX with standard headings and selectable text.'
    return score, checks, details, feedback


def score_searchability(contact_score: int, ats_readability_score: int) -> tuple[int, str]:
    score = clamp(contact_score * 0.60 + ats_readability_score * 0.40)
    if score >= 85:
        return score, 'Searchability is strong: recruiters should be able to find contact and core resume information.'
    if score >= 70:
        return score, 'Searchability is good, but adding links or clearer formatting would help.'
    if score >= 50:
        return score, 'Searchability needs improvement. Make contact details and sections easier to parse.'
    return score, 'Searchability is weak. Add clear contact information, headings, dates, and selectable text.'


def match_level(score: int) -> str:
    if score >= 85:
        return 'Excellent'
    if score >= 75:
        return 'High'
    if score >= 60:
        return 'Moderate'
    if score >= 45:
        return 'Fair'
    return 'Low'


def readability_level(score: int) -> str:
    if score >= 90:
        return 'Excellent'
    if score >= 70:
        return 'Good'
    if score >= 50:
        return 'Needs work'
    return 'Poor'

def split_job_description_units(job_description: str) -> list[str]:
    """Split JD into small readable context units for recommendation priority."""
    units: list[str] = []

    for line in re.split(r'[\r\n]+', job_description or ''):
        line = line.strip(' •·-–—\t')
        if not line:
            continue

        parts = re.split(r'(?<=[.!?])\s+', line)
        for part in parts:
            clean = part.strip(' •·-–—\t')
            if clean:
                units.append(clean)

    return units


def term_aliases_for_recommendation(term: str, details: dict[str, Any] | None = None) -> list[str]:
    aliases: list[str] = [term]

    if isinstance(details, dict):
        exact_keywords = details.get('exact_job_keywords') or {}
        aliases.extend(exact_keywords.get(term, []) or [])

    catalog_config = SKILL_CATALOG.get(term)
    if catalog_config:
        aliases.extend(catalog_config.get('aliases', []) or [])

    return unique_preserve_order([str(alias) for alias in aliases if str(alias).strip()])


def context_for_missing_term(job_description: str, term: str, details: dict[str, Any] | None = None) -> str:
    aliases = term_aliases_for_recommendation(term, details)
    units = split_job_description_units(job_description)

    for unit in units:
        if any(contains_phrase(unit, alias) for alias in aliases):
            return unit

    # Fallback for cases where punctuation/casing makes strict phrase matching miss.
    for unit in units:
        unit_norm = normalize_for_matching(unit)
        if any(normalize_for_matching(alias) in unit_norm for alias in aliases if normalize_for_matching(alias)):
            return unit

    return ''


def missing_term_priority_from_context(context: str) -> str:
    """Classify missing skill importance from JD wording.

    This is intentionally industry-neutral:
    - core: must/required/strong/solid/experience with
    - desirable: highly desirable/advantage
    - plus: plus/preferred/nice to have/familiarity
    """

    normalized = normalize_for_matching(context)

    if re.search(r'\b(highly desirable|desirable|strongly preferred|advantage|advantageous)\b', normalized):
        return 'desirable'

    if re.search(r'\b(plus|preferred|nice to have|bonus|optional|familiarity with|familiar with)\b', normalized):
        return 'plus'

    if re.search(
        r'\b(required|must|need|needs|strong|solid|fundamentals|hands on|hands-on|commercial experience|experience with|proficient|background)\b',
        normalized,
    ):
        return 'core'

    return 'core'


def bucket_missing_hard_skills(
    missing_hard: list[str],
    job_description: str,
    hard_details: dict[str, Any] | None = None,
) -> dict[str, list[str]]:
    buckets = {
        'core': [],
        'desirable': [],
        'plus': [],
        'other': [],
    }

    for term in missing_hard or []:
        clean_term = str(term).strip()
        if not clean_term:
            continue

        context = context_for_missing_term(job_description, clean_term, hard_details)
        priority = missing_term_priority_from_context(context) if context else 'other'

        buckets.setdefault(priority, []).append(clean_term)

    return {key: unique_preserve_order(value) for key, value in buckets.items()}


def readable_term_list(items: list[str], limit: int = 4) -> str:
    clean = unique_preserve_order([str(item).strip() for item in items if str(item).strip()])

    if not clean:
        return ''

    if len(clean) <= limit:
        return ', '.join(clean)

    return f"{', '.join(clean[:limit])}, and {len(clean) - limit} more"


def build_hard_skill_recommendations(
    missing_hard: list[str],
    job_description: str,
    hard_details: dict[str, Any] | None = None,
) -> list[str]:
    buckets = bucket_missing_hard_skills(missing_hard, job_description, hard_details)
    recommendations: list[str] = []

    if buckets.get('core'):
        recommendations.append(
            f"Add missing core job keywords where truthful: {readable_term_list(buckets['core'])}."
        )

    if buckets.get('desirable'):
        recommendations.append(
            f"If you have relevant experience, mention desirable keywords from the job description: {readable_term_list(buckets['desirable'])}."
        )

    if buckets.get('plus'):
        recommendations.append(
            f"Add optional or plus keywords only if accurate: {readable_term_list(buckets['plus'])}."
        )

    if not recommendations and missing_hard:
        recommendations.append(
            f"Add missing job-specific hard skills where truthful: {readable_term_list(missing_hard)}."
        )

    return recommendations


SOFT_SKILL_RECOMMENDATION_LABELS = {
    'Initiative': 'proactivity or taking initiative',
    'Stakeholder Management': 'working with stakeholders, clients, patients, guests, or non-technical users',
    'Problem Solving': 'practical problem solving',
    'Communication': 'clear communication',
    'Collaboration': 'team or cross-functional collaboration',
    'Leadership': 'leadership or ownership',
    'Ownership': 'ownership of outcomes',
    'Async Collaboration': 'remote or async collaboration',
    'Pragmatism': 'pragmatic decision-making',
    'Adaptability': 'adaptability',
    'Detail Orientation': 'attention to detail',
    'Customer Focus': 'customer or user focus',
    'Empathy': 'empathy',
    'Time Management': 'time management',
}


def soft_skill_phrase(term: str) -> str:
    return SOFT_SKILL_RECOMMENDATION_LABELS.get(term, str(term).strip().lower())


def build_soft_skill_recommendation(
    missing_soft: list[str],
    job_description: str,
    soft_details: dict[str, Any] | None = None,
) -> str:
    clean_terms = unique_preserve_order([str(item).strip() for item in missing_soft if str(item).strip()])

    if not clean_terms:
        return ''

    phrases = unique_preserve_order([soft_skill_phrase(term) for term in clean_terms])

    jd_norm = normalize_for_matching(job_description)

    if any(word in jd_norm for word in ['working style', 'proactive', 'comfortable', 'stakeholder', 'team', 'customer', 'client', 'patient', 'guest']):
        return (
            f"Strengthen working-style evidence by adding examples of {readable_term_list(phrases, limit=4)}, "
            "because the job description emphasizes these behaviours."
        )

    return (
        f"Add evidence of {readable_term_list(phrases, limit=4)} where accurate, "
        "instead of only listing soft-skill words."
    )

def build_top_fixes(
    missing_hard: list[str],
    missing_soft: list[str],
    missing_industry: list[str],
    ats_warnings: list[str],
    recruiter_tips: list[str],
    missing_title: list[str] | None = None,
    missing_experience: list[str] | None = None,
    missing_education: list[str] | None = None,
    hard_details: dict[str, Any] | None = None,
    soft_details: dict[str, Any] | None = None,
    job_description: str = '',
) -> list[str]:
    fixes: list[str] = []

    missing_title = missing_title or []
    missing_experience = missing_experience or []
    missing_education = missing_education or []
    missing_hard = missing_hard or []
    missing_soft = missing_soft or []
    missing_industry = missing_industry or []
    ats_warnings = ats_warnings or []
    recruiter_tips = recruiter_tips or []

    if missing_title:
        fixes.append(
            f'Add the exact target job title "{missing_title[0]}" only if it accurately describes the role you are targeting.'
        )

    if missing_experience:
        fixes.append(
            f'Clarify experience requirement: {missing_experience[0]}.'
        )

    if missing_education:
        fixes.append(
            f'Add exact education requirement wording where truthful: {", ".join(missing_education[:3])}.'
        )

    hard_recommendations = build_hard_skill_recommendations(
        missing_hard,
        job_description,
        hard_details,
    )

    for recommendation in hard_recommendations[:2]:
        if recommendation:
            fixes.append(recommendation)

    soft_recommendation = build_soft_skill_recommendation(
        missing_soft,
        job_description,
        soft_details,
    )

    if soft_recommendation:
        fixes.append(soft_recommendation)

    for warning in ats_warnings:
        if len(fixes) >= 3:
            break
        if warning:
            fixes.append(warning)

    for tip in recruiter_tips:
        if len(fixes) >= 3:
            break
        if tip:
            fixes.append(tip)

    return unique_preserve_order(fixes)[:3]

def measurable_example_for_resume(resume_text: str, job_description: str = '', job_title: str = '') -> str:
    target_context = normalize_for_matching(f'{job_title} {job_description}')
    resume_context = normalize_for_matching(resume_text)
    normalized = target_context or resume_context

    # Use the target job first. This keeps advice industry-aware even when the resume
    # contains unrelated words such as "learning" from an academy or education section.
    if any(term in normalized for term in ['web developer', 'software', 'developer', 'html', 'css', 'javascript', 'react', 'database', 'api', 'cloud', 'seo', 'cms']):
        return 'websites built, pages optimized, bugs fixed, load-time improvements, SEO growth, users supported, or project delivery time'
    if any(term in normalized for term in ['waiter', 'restaurant', 'food and beverage', 'food beverage', 'guest', 'hospitality', 'hotel']):
        return 'number of tables served, guest satisfaction, upselling results, or service volume'
    if any(term in normalized for term in ['learning design', 'training', 'content', 'instructional', 'e-learning', 'elearning', 'lms', 'education technology']):
        return 'number of modules created, learners supported, completion rates, content volume, or turnaround time'
    if any(term in normalized for term in ['marketing', 'campaign', 'social media', 'content marketing', 'google ads']):
        return 'campaign reach, leads generated, conversion rate, engagement growth, or traffic increase'
    if any(term in normalized for term in ['sales', 'crm', 'lead generation', 'account management', 'customer success']):
        return 'revenue generated, sales targets achieved, leads converted, retention rate, or accounts managed'
    if any(term in normalized for term in ['accounting', 'finance', 'payroll', 'budget', 'bookkeeping', 'tax']):
        return 'reports completed, reconciliation accuracy, budget size, processing time, or error reduction'
    if any(term in normalized for term in ['recruitment', 'hr', 'talent acquisition', 'onboarding', 'employee']):
        return 'roles filled, time-to-hire reduction, employees onboarded, retention improvement, or training participation'
    if any(term in normalized for term in ['patient', 'clinical', 'nursing', 'healthcare', 'medical', 'clinic']):
        return 'patients supported, documentation accuracy, response time, safety compliance, or care quality results'
    if any(term in normalized for term in ['inventory', 'warehouse', 'logistics', 'supply chain', 'procurement', 'operations']):
        return 'orders processed, inventory accuracy, delivery time, cost savings, or process efficiency improvements'
    if any(term in normalized for term in ['teacher', 'teaching', 'student', 'classroom', 'lesson', 'curriculum']):
        return 'students supported, lesson outcomes, assessment improvement, completion rates, or class size'
    if any(term in normalized for term in ['design', 'photoshop', 'illustrator', 'figma', 'brand', 'video editing']):
        return 'assets created, turnaround time, engagement results, brand consistency, or client approvals'
    if any(term in normalized for term in ['construction', 'engineering', 'autocad', 'revit', 'site', 'qa qc', 'safety']):
        return 'projects completed, defects reduced, safety record, drawing volume, or schedule improvement'
    if any(term in normalized for term in ['admin', 'office', 'calendar', 'data entry', 'customer support', 'ticketing']):
        return 'requests handled, documents processed, response time, scheduling accuracy, or customer satisfaction'
    if any(term in normalized for term in ['retail', 'cash handling', 'shopify', 'e-commerce', 'ecommerce', 'merchandising']):
        return 'sales volume, transactions handled, inventory accuracy, order volume, or customer satisfaction'
    return 'volume handled, quality improvement, time saved, customer/user impact, or business results'


def build_recruiter_tips(resume_text: str, contact_info: dict[str, Any], date_ranges: list[dict[str, Any]], job_description: str = '', job_title: str = '') -> dict[str, Any]:
    words = tokenize_words(resume_text)
    tips: list[str] = []
    strengths: list[str] = []

    measurable_patterns = re.findall(
        r'\b(?:'
        r'increased|reduced|improved|saved|served|handled|managed|trained|achieved|generated|created|developed|delivered|'
        r'led|implemented|optimized|optimised|automated|mentored|integrated|participated|enhanced|boosted|decreased|cut|'
        r'accelerated|supported|processed|completed|launched|built|designed'
        r')\b[^\n]{0,140}\b\d+[\d,.%]*\b',
        resume_text or '',
        flags=re.IGNORECASE,
    )
    if len(measurable_patterns) < 2:
        tips.append(f'Add 2-3 measurable achievements, such as {measurable_example_for_resume(resume_text, job_description, job_title)}.')
    else:
        strengths.append('Measurable achievements are present.')

    if not contact_info.get('links'):
        tips.append('Add a LinkedIn profile, portfolio, GitHub, or professional website if relevant for this role.')
    else:
        strengths.append('Professional web presence is included.')

    if len(words) < 250:
        tips.append('Add more role-relevant detail. The resume is quite short for keyword matching.')
    elif len(words) > 1200:
        tips.append('Shorten the resume and keep the most relevant achievements for the target job.')
    else:
        strengths.append('Resume length is reasonable.')

    tips.extend(date_format_issues(date_ranges))

    action_verbs = ['managed', 'delivered', 'provided', 'created', 'developed', 'improved', 'supported', 'assisted', 'handled', 'coordinated', 'maintained']
    if any(contains_phrase(resume_text, verb) for verb in action_verbs):
        strengths.append('Action-oriented bullet wording is present.')
    else:
        tips.append('Start bullets with clear action verbs such as delivered, managed, improved, supported, or coordinated.')

    issue_count = len(unique_preserve_order(tips))
    score = clamp(100 - issue_count * 14)
    return {
        'name': 'Recruiter Tips',
        'score': score,
        'issues_to_fix': issue_count,
        'tips': unique_preserve_order(tips),
        'strengths': unique_preserve_order(strengths),
        'feedback': f'{issue_count} issue{"s" if issue_count != 1 else ""} to fix for recruiter readability and human review.',
    }

def issue_group_from_check(name: str, score: int, matched: list[str], missing: list[str], feedback: str) -> dict[str, Any]:
    return {
        'name': name,
        'status': match_level(score),
        'issues_to_fix': len(unique_preserve_order(missing)),
        'items': unique_preserve_order(matched),
        'issues': unique_preserve_order(missing),
        'feedback': feedback,
        'score': score,
    }


def build_issue_groups(
    hard_details: dict[str, Any],
    soft_details: dict[str, Any],
    contact_info: dict[str, Any],
    contact_checks: list[dict[str, Any]],
    ats_readability_score: int,
    ats_warnings: list[str],
    recruiter_tips: dict[str, Any],
    file_type: str,
    title_score: int,
    title_matches: list[str],
    title_missing: list[str],
    title_feedback: str,
    exp_checks: list[dict[str, Any]],
    edu_checks: list[dict[str, Any]],
    experience_required: bool = False,
    education_required: bool = False,
) -> dict[str, Any]:
    search_issues = [check['feedback'] for check in contact_checks if not check.get('passed')]
    if ats_readability_score < 70:
        search_issues.extend(ats_warnings[:2])
    search_items = [check['name'] for check in contact_checks if check.get('passed')]

    issue_groups: dict[str, Any] = {
        'searchability': {
            'name': 'Searchability',
            'status': readability_level(ats_readability_score),
            'issues_to_fix': len(unique_preserve_order(search_issues)),
            'items': search_items,
            'issues': unique_preserve_order(search_issues),
        },
        'job_title': issue_group_from_check('Job Title Match', title_score, title_matches, title_missing, title_feedback),
        'hard_skills': {
            'name': 'Hard Skills',
            'status': match_level(clamp(len(hard_details.get('matched_hard_skills', [])) / max(1, len(hard_details.get('required_hard_skills', []))) * 100)) if hard_details.get('required_hard_skills') else 'Neutral',
            'issues_to_fix': len(hard_details.get('missing_hard_skills', [])),
            'matched': hard_details.get('matched_hard_skills', []),
            'missing': hard_details.get('missing_hard_skills', []),
            'feedback': hard_details.get('feedback') or 'Hard-skill requirements were checked against the resume.',
        },
        'soft_skills': {
            'name': 'Soft Skills',
            'status': match_level(clamp(len(soft_details.get('matched_soft_skills', [])) / max(1, len(soft_details.get('required_soft_skills', []))) * 100)) if soft_details.get('required_soft_skills') else 'Neutral',
            'issues_to_fix': len(soft_details.get('missing_soft_skills', [])),
            'matched': soft_details.get('matched_soft_skills', []),
            'missing': soft_details.get('missing_soft_skills', []),
            'feedback': soft_details.get('feedback') or 'Soft-skill requirements were checked against the resume.',
        },
        'formatting': {
            'name': 'Formatting',
            'status': (file_type or '').upper() or 'Unknown',
            'issues_to_fix': len(ats_warnings),
            'issues': ats_warnings,
        },
    }

    if experience_required:
        exp_check = exp_checks[0] if exp_checks else {'score': 0, 'matched': [], 'missing': [], 'feedback': 'No experience check available.'}
        issue_groups['experience'] = issue_group_from_check('Experience Years', int(exp_check.get('score', 0)), exp_check.get('matched', []), exp_check.get('missing', []), exp_check.get('feedback', ''))

    if education_required:
        edu_check = edu_checks[0] if edu_checks else {'score': 0, 'matched': [], 'missing': [], 'feedback': 'No education check available.'}
        issue_groups['education'] = issue_group_from_check('Education Match', int(edu_check.get('score', 0)), edu_check.get('matched', []), edu_check.get('missing', []), edu_check.get('feedback', ''))

    return issue_groups



def weighted_job_match_score(score_weights: list[tuple[int, float, bool]]) -> int:
    active = [(score, weight) for score, weight, active in score_weights if active]
    total_weight = sum(weight for _, weight in active)
    if total_weight <= 0:
        return 0
    return clamp(sum(score * weight for score, weight in active) / total_weight)

def calculate_ats_result(resume: Any, job_title: str, job_description: str) -> dict[str, Any]:
    resume_text = resume.extracted_text or ''
    parser_metadata = resume.parser_metadata or {}
    file_type = resume.file_type or resume.extension

    contact_info = extract_contact_info(resume_text)
    contact_score, contact_checks, contact_feedback = score_contact_info(contact_info)

    hard_score, hard_checks, hard_details, hard_feedback = score_hard_skills(resume_text, job_description)
    soft_score, soft_checks, soft_details, soft_feedback = score_soft_skills(resume_text, job_description)
    title_score, title_matches, title_missing, title_feedback = score_job_title(job_title, resume_text)
    exp_score, exp_checks, exp_details, exp_feedback = score_required_experience(resume_text, job_description)
    edu_score, edu_checks, edu_details, edu_feedback = score_education_requirements(resume_text, job_description)
    industry_score, industry_checks, industry_details, industry_feedback = score_industry_keywords(resume_text, job_description)
    ats_readability_score, readability_checks, readability_details, readability_feedback = score_ats_readability(resume_text, parser_metadata, file_type, contact_info)
    searchability_score, searchability_feedback = score_searchability(contact_score, ats_readability_score)

    experience_required = bool(exp_details.get('requirement_detected'))
    education_required = bool(edu_details.get('requirement_detected'))

    job_match_score = weighted_job_match_score([
        (hard_score, 0.30, True),
        (soft_score, 0.15, True),
        (title_score, 0.15, True),
        (exp_score, 0.15, experience_required),
        (edu_score, 0.05, education_required),
        (industry_score, 0.10, True),
        (searchability_score, 0.10, True),
    ])

    # Keep the main score realistic: a resume should not receive a high job-match score
    # when both hard-skill and soft-skill alignment are weak, even if contact info,
    # experience length, and file type are good.
    if hard_score < 60 and soft_score < 50:
        job_match_score = min(job_match_score, 68)
    if hard_score <= 50 and soft_score <= 40 and industry_score < 70:
        job_match_score = min(job_match_score, 65)

    job_match_feedback = 'Based on strict job-description alignment: exact keywords, exact job title, ATS searchability, and any experience or education requirements found in the job description.'
    recruiter_tips = build_recruiter_tips(resume_text, contact_info, exp_details.get('date_ranges', []), job_description, job_title)
    ats_warnings = readability_details.get('warnings', [])

    top_fixes = build_top_fixes(
        hard_details.get('missing_hard_skills', []),
        soft_details.get('missing_soft_skills', []),
        industry_details.get('missing_industry_terms', []),
        ats_warnings,
        recruiter_tips.get('tips', []),
        title_missing,
        exp_checks[0].get('missing', []) if experience_required and exp_checks else [],
        edu_details.get('missing_education_terms', []) if education_required else [],
        hard_details=hard_details,
        soft_details=soft_details,
        job_description=job_description,
    )

    matched_requirements = unique_preserve_order(
        hard_details.get('matched_hard_skills', [])
        + soft_details.get('matched_soft_skills', [])
        + industry_details.get('matched_industry_terms', [])
        + (['Required experience'] if exp_score >= 80 else [])
        + (title_matches if title_score >= 80 else [])
    )[:20]

    missing_weak_requirements = unique_preserve_order(
        hard_details.get('missing_hard_skills', [])
        + soft_details.get('missing_soft_skills', [])
        + industry_details.get('missing_industry_terms', [])
        + ([] if title_score >= 80 else title_missing or ['Exact target job title'])
        + ([] if (not experience_required or exp_score >= 80) else (exp_checks[0].get('missing', []) if exp_checks else ['Required experience']))
        + ([] if (not education_required or edu_score >= 80) else edu_details.get('missing_education_terms', []))
    )[:25]

    sections = [
        {
            'key': 'hard_skills',
            'name': 'Hard Skills',
            'score': hard_score,
            'feedback': hard_feedback,
            'checks': hard_checks,
            'details': hard_details,
        },
        {
            'key': 'soft_skills',
            'name': 'Soft Skills',
            'score': soft_score,
            'feedback': soft_feedback,
            'checks': soft_checks,
            'details': soft_details,
        },
        {
            'key': 'job_title_role_match',
            'name': 'Job Title / Role Match',
            'score': title_score,
            'feedback': title_feedback,
            'checks': [{
                'name': 'Exact target job title',
                'score': title_score,
                'feedback': title_feedback,
                'matched': title_matches,
                'missing': title_missing,
            }],
            'details': {'title_variations': extract_job_title_variations(job_title), 'matched_title_terms': title_matches, 'missing_title_terms': title_missing, 'matching_mode': 'strict_exact_target_job_title'},
        },
        {
            'key': 'required_experience',
            'name': 'Required Experience',
            'score': exp_score,
            'feedback': exp_feedback,
            'checks': exp_checks,
            'details': exp_details,
        },
        {
            'key': 'education_certifications',
            'name': 'Education / Certifications',
            'score': edu_score,
            'feedback': edu_feedback,
            'checks': edu_checks,
            'details': edu_details,
        },
        {
            'key': 'industry_keywords_phrases',
            'name': 'Industry Keywords & Important Phrases',
            'score': industry_score,
            'feedback': industry_feedback,
            'checks': industry_checks,
            'details': industry_details,
        },
        {
            'key': 'searchability',
            'name': 'ATS Searchability',
            'score': searchability_score,
            'feedback': searchability_feedback,
            'checks': [
                {
                    'name': 'Contact information',
                    'score': contact_score,
                    'feedback': contact_feedback,
                    'matched': [check['name'] for check in contact_checks if check.get('passed')],
                    'missing': [check['name'] for check in contact_checks if not check.get('passed')],
                },
                {
                    'name': 'ATS readability',
                    'score': ats_readability_score,
                    'feedback': readability_feedback,
                    'missing': ats_warnings,
                },
            ],
            'details': {'contact_info': contact_info, 'ats_readability_score': ats_readability_score},
        },
        {
            'key': 'ats_readability',
            'name': 'ATS Readability Details',
            'score': ats_readability_score,
            'feedback': readability_feedback,
            'checks': readability_checks,
            'details': readability_details,
        },
    ]

    score_cards = [
        {
            'key': 'job_match',
            'name': 'Job Match Score',
            'score': job_match_score,
            'level': match_level(job_match_score),
            'feedback': job_match_feedback,
        },
        {
            'key': 'ats_readability',
            'name': 'ATS Readability Score',
            'score': ats_readability_score,
            'level': readability_level(ats_readability_score),
            'feedback': readability_feedback,
        },
    ]

    issue_groups = build_issue_groups(
        hard_details,
        soft_details,
        contact_info,
        contact_checks,
        ats_readability_score,
        ats_warnings,
        recruiter_tips,
        file_type,
        title_score,
        title_matches,
        title_missing,
        title_feedback,
        exp_checks,
        edu_checks,
        experience_required,
        education_required,
    )

    return {
        'engine': 'rule_based_hybrid_phrase_quality_exact_ats_v8',
        'overall_score': job_match_score,
        'match_level': match_level(job_match_score),
        'job_match_score': job_match_score,
        'job_match_level': match_level(job_match_score),
        'ats_readability_score': ats_readability_score,
        'ats_readability_level': readability_level(ats_readability_score),
        'recruiter_improvement_score': recruiter_tips['score'],
        'score_cards': score_cards,
        'issue_groups': issue_groups,
        'sections': sections,
        'summary': {
            'resume_name': resume.original_name,
            'job_title': job_title,
            'job_match_score': job_match_score,
            'job_match_level': match_level(job_match_score),
            'job_match_explanation': job_match_feedback,
            'ats_readability_score': ats_readability_score,
            'ats_readability_level': readability_level(ats_readability_score),
            'top_fixes': top_fixes,
            'matched_requirements': matched_requirements,
            'missing_weak_requirements': missing_weak_requirements,
            'matched_skills': unique_preserve_order(hard_details.get('matched_hard_skills', []) + soft_details.get('matched_soft_skills', [])),
            'missing_skills': unique_preserve_order(hard_details.get('missing_hard_skills', []) + soft_details.get('missing_soft_skills', [])),
            'hard_skills': {
                'required': hard_details.get('required_hard_skills', []),
                'matched': hard_details.get('matched_hard_skills', []),
                'missing': hard_details.get('missing_hard_skills', []),
                'score': hard_score,
                'confidence': hard_details.get('extraction_confidence', 'unknown'),
            },
            'soft_skills': {
                'required': soft_details.get('required_soft_skills', []),
                'matched': soft_details.get('matched_soft_skills', []),
                'missing': soft_details.get('missing_soft_skills', []),
                'score': soft_score,
                'confidence': soft_details.get('extraction_confidence', 'unknown'),
            },
            'industry_keywords': {
                'required': industry_details.get('required_industry_terms', []),
                'matched': industry_details.get('matched_industry_terms', []),
                'missing': industry_details.get('missing_industry_terms', []),
                'score': industry_score,
            },
            'job_title_match': {
                'required': [clean_job_title_for_display(job_title)] if clean_job_title_for_display(job_title) else [],
                'matched': title_matches,
                'missing': title_missing,
                'score': title_score,
                'feedback': title_feedback,
            },
            'experience_year_match': {
                'applied': experience_required,
                'score': exp_score,
                'feedback': exp_feedback,
                'required': exp_details.get('required_years_from_job_description', {}),
                'matched': exp_checks[0].get('matched', []) if exp_checks else [],
                'missing': exp_checks[0].get('missing', []) if exp_checks else [],
                'estimated_years': exp_details.get('estimated_total_experience_years', 0),
                'explicit_years': exp_details.get('explicit_experience_years', []),
            },
            'education_match': {
                'applied': education_required,
                'score': edu_score,
                'feedback': edu_feedback,
                'required': edu_details.get('required_education_terms', []),
                'matched': edu_details.get('matched_education_terms', []),
                'missing': edu_details.get('missing_education_terms', []),
            },
            'keyword_extraction': {
                'mode': 'Catalog + regex + phrase-quality-gated dynamic extraction, then strict exact resume matching',
                'dynamic_hard_keywords': hard_details.get('dynamic_hard_skills', []),
                'dynamic_soft_keywords': soft_details.get('dynamic_soft_skills', []),
                'dynamic_industry_keywords': [item.get('name') for item in get_dynamic_requirements(job_description).get('industry', [])],
            },
            'contact_info': contact_info,
            'searchability': issue_groups['searchability'],
            'recruiter_tips': recruiter_tips,
            'estimated_experience_years': exp_details['estimated_total_experience_years'],
            'layout_warnings': ats_warnings,
            'ats_guidance_note': 'To improve the ATS score, follow the Top 3 Fixes and ATS Checklist. Gemini AI analysis is separate human/recruiter context and does not change the rule-based score.',
        },
        'disclaimer': 'Follow the ATS Top Fixes and ATS Checklist to improve the rule-based score. Gemini AI analysis is separate human-review context and does not determine the ATS score.',
    }

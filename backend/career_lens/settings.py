import os
from pathlib import Path
from dotenv import load_dotenv
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / '.env')


def env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {'1', 'true', 'yes', 'on'}


def env_list(name: str, default: str = '') -> list[str]:
    value = os.getenv(name, default)
    return [item.strip() for item in value.split(',') if item.strip()]

SECRET_KEY = os.getenv('SECRET_KEY', 'dev-only-change-me')
DEBUG = env_bool('DEBUG', True)
ALLOWED_HOSTS = env_list('ALLOWED_HOSTS', 'localhost,127.0.0.1')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'resumes',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'career_lens.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'career_lens.wsgi.application'

DB_ENGINE = os.getenv('DB_ENGINE', 'mysql').strip().lower()
if DB_ENGINE == 'sqlite':
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.mysql',
            'NAME': os.getenv('DB_NAME', 'careerlens_db'),
            'USER': os.getenv('DB_USER', 'careerlens_user'),
            'PASSWORD': os.getenv('DB_PASSWORD', 'careerlens_password'),
            'HOST': os.getenv('DB_HOST', '127.0.0.1'),
            'PORT': os.getenv('DB_PORT', '3306'),
            'OPTIONS': {
                'charset': 'utf8mb4',
                'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
            },
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = os.getenv('TIME_ZONE', 'Asia/Yangon')
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.FormParser',
        'rest_framework.parsers.MultiPartParser',
    ],
    'DATETIME_FORMAT': '%Y-%m-%d %H:%M:%S %Z',
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=6),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
}

CORS_ALLOWED_ORIGINS = env_list('CORS_ALLOWED_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173')
CORS_ALLOW_CREDENTIALS = True

MAX_RESUME_UPLOAD_MB = int(os.getenv('MAX_RESUME_UPLOAD_MB', '15'))
DATA_UPLOAD_MAX_MEMORY_SIZE = MAX_RESUME_UPLOAD_MB * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = MAX_RESUME_UPLOAD_MB * 1024 * 1024

def env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        return default


def unique_env_values(values: list[str]) -> list[str]:
    output: list[str] = []

    for value in values:
        clean = str(value or '').strip()

        if clean and clean not in output:
            output.append(clean)

    return output


GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '').strip()
GEMINI_API_KEY_2 = os.getenv('GEMINI_API_KEY_2', '').strip()
GEMINI_API_KEY_3 = os.getenv('GEMINI_API_KEY_3', '').strip()

GEMINI_API_KEYS = unique_env_values(
    env_list('GEMINI_API_KEYS')
    + [GEMINI_API_KEY, GEMINI_API_KEY_2, GEMINI_API_KEY_3]
)

GEMINI_API_KEY = GEMINI_API_KEYS[0] if GEMINI_API_KEYS else ''
GEMINI_RETRY_ATTEMPTS = max(1, env_int('GEMINI_RETRY_ATTEMPTS', 1))
GEMINI_KEY_SWITCH_DELAY_SECONDS = max(0, env_int('GEMINI_KEY_SWITCH_DELAY_SECONDS', 2))
GEMINI_MODEL = os.getenv('GEMINI_MODEL', 'gemini-2.5-flash-lite')


GEMINI_COVER_LETTER_API_KEY = os.getenv(
    'GEMINI_COVER_LETTER_API_KEY',
    GEMINI_API_KEY,
).strip()

GEMINI_COVER_LETTER_API_KEY_2 = os.getenv(
    'GEMINI_COVER_LETTER_API_KEY_2',
    GEMINI_API_KEY_2,
).strip()

GEMINI_COVER_LETTER_API_KEY_3 = os.getenv(
    'GEMINI_COVER_LETTER_API_KEY_3',
    GEMINI_API_KEY_3,
).strip()

GEMINI_COVER_LETTER_API_KEYS = unique_env_values(
    env_list('GEMINI_COVER_LETTER_API_KEYS')
    + [
        GEMINI_COVER_LETTER_API_KEY,
        GEMINI_COVER_LETTER_API_KEY_2,
        GEMINI_COVER_LETTER_API_KEY_3,
        *GEMINI_API_KEYS,
    ]
)

GEMINI_COVER_LETTER_MODEL = os.getenv(
    'GEMINI_COVER_LETTER_MODEL',
    GEMINI_MODEL,
)


GEMINI_INTERVIEW_API_KEY = os.getenv(
    'GEMINI_INTERVIEW_API_KEY',
    GEMINI_API_KEY,
).strip()

GEMINI_INTERVIEW_API_KEY_2 = os.getenv(
    'GEMINI_INTERVIEW_API_KEY_2',
    GEMINI_API_KEY_2,
).strip()

GEMINI_INTERVIEW_API_KEY_3 = os.getenv(
    'GEMINI_INTERVIEW_API_KEY_3',
    GEMINI_API_KEY_3,
).strip()

GEMINI_INTERVIEW_API_KEYS = unique_env_values(
    env_list('GEMINI_INTERVIEW_API_KEYS')
    + [
        GEMINI_INTERVIEW_API_KEY,
        GEMINI_INTERVIEW_API_KEY_2,
        GEMINI_INTERVIEW_API_KEY_3,
        *GEMINI_API_KEYS,
    ]
)

GEMINI_INTERVIEW_MODEL = os.getenv(
    'GEMINI_INTERVIEW_MODEL',
    GEMINI_MODEL,
)

JSEARCH_API_KEY = os.getenv('JSEARCH_API_KEY', '')
JSEARCH_API_HOST = os.getenv('JSEARCH_API_HOST', 'jsearch.p.rapidapi.com')

GOOGLE_OAUTH_CLIENT_ID = os.getenv('GOOGLE_OAUTH_CLIENT_ID', '')
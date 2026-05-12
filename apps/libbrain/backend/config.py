"""Libbrain backend config.""""""
from apps._shared.config import build_cors_origins, require_env

ALLOWED_ORIGINS = build_cors_origins("8205", ['https://libbrain.paperlab.xyz'])
REQUIRED = ['STAFF_PASSWORD']


def require_all():
    require_env(REQUIRED)

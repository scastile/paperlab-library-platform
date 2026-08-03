"""Crossword backend config."""
from _shared.config import build_cors_origins, require_env

ALLOWED_ORIGINS = build_cors_origins("8206", [
    "https://paperlab.xyz",
    "http://10.0.0.179:8206",
])
REQUIRED = ["OPENROUTER_API_KEY", "DB_PATH"]


def require_all():
    require_env(REQUIRED)

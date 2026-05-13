"""Event Flyer Studio backend config."""
from _shared.config import build_cors_origins, require_env

ALLOWED_ORIGINS = build_cors_origins("8204", ['https://flyer.paperlab.xyz'])
REQUIRED = ['OPENROUTER_API_KEY', 'SUPABASE_JWT_SECRET']


def require_all():
    require_env(REQUIRED)

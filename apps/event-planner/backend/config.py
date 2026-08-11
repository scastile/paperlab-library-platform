"""Event Planner backend config."""
from _shared.config import build_cors_origins, require_env

ALLOWED_ORIGINS = build_cors_origins("8207", ['https://lib.paperlab.xyz'])
REQUIRED = ['POCKETBASE_URL', 'LAUNCHPAD_URL']


def require_all():
    require_env(REQUIRED)

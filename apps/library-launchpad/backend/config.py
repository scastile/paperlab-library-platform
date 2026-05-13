"""Library Launchpad backend config."""
import sys
import os

# Add parent dir so _shared is importable
_app_dir = os.path.dirname(os.path.abspath(__file__))
if _app_dir not in sys.path:
    sys.path.insert(0, _app_dir)

from _shared.config import build_cors_origins, require_env

ALLOWED_ORIGINS = build_cors_origins("8200", ["https://launchpad.paperlab.xyz", "https://lib.paperlab.xyz"])
REQUIRED = ["OPENROUTER_API_KEY", "SUPABASE_JWT_SECRET", "SUPABASE_URL", "STRIPE_SECRET_KEY"]


def require_all():
    require_env(REQUIRED)

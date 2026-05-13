"""Library Launchpad backend config."""
import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '_shared'))
from config import build_cors_origins, require_env

ALLOWED_ORIGINS = build_cors_origins("8200", ["https://launchpad.paperlab.xyz", "https://lib.paperlab.xyz"])
REQUIRED = ["OPENROUTER_API_KEY", "SUPABASE_JWT_SECRET", "SUPABASE_URL", "STRIPE_SECRET_KEY"]


def require_all():
    require_env(REQUIRED)

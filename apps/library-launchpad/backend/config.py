"""Shared config for Library Launchpad backend."""
import os

PORT = "8200"
DOMAINS = ["https://launchpad.paperlab.xyz", "https://lib.paperlab.xyz"]
REQUIRED = ["OPENROUTER_API_KEY", "SUPABASE_JWT_SECRET", "SUPABASE_URL", "STRIPE_SECRET_KEY"]


def build_cors_origins() -> list[str]:
    raw = os.getenv("ALLOWED_ORIGINS", "")
    if raw:
        return [o.strip() for o in raw.split(",") if o.strip()]
    origins = [f"http://10.0.0.179:{PORT}", f"http://localhost:{PORT}"]
    origins.extend(DOMAINS)
    return [o for o in origins if o]


def require_env() -> None:
    missing = [k for k in REQUIRED if not os.getenv(k)]
    if missing:
        raise RuntimeError(f"Missing required env vars: {', '.join(missing)}")

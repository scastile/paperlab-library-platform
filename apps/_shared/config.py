"""Shared backend config — used by all backends."""
import os


def build_cors_origins(port: str, domains=None):
    """Build sorted CORS origin list for a backend."""
    raw = os.getenv("ALLOWED_ORIGINS", "")
    if raw:
        return [o.strip() for o in raw.split(",") if o.strip()]
    base = [
        f"http://10.0.0.179:{port}",
        f"http://localhost:{port}",
    ]
    if domains:
        base.extend(domains)
    return base


def require_env(keys):
    """Raise RuntimeError if any required env var is missing or empty."""
    missing = [k for k in keys if not os.getenv(k)]
    if missing:
        raise RuntimeError(f"Missing required environment variables: {', '.join(missing)}")

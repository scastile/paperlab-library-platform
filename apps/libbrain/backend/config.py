"""Shared config for LibBrain backend."""
import os

PORT = "8205"
DOMAINS = ["https://libbrain.paperlab.xyz"]
REQUIRED = ["STAFF_PASSWORD"]


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

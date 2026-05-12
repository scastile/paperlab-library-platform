"""Shared config — CORS origins + env validation for Escape Room Designer."""
import os

ALLOWED_DOMAINS = ["https://escape.paperlab.xyz"]
PORT = "8203"


def build_cors_origins() -> list[str]:
    raw = os.getenv("ALLOWED_ORIGINS", "")
    if raw:
        return [o.strip() for o in raw.split(",") if o.strip()]
    origins = [
        f"http://10.0.0.179:{PORT}",
        f"http://localhost:{PORT}",
    ]
    origins.extend(ALLOWED_DOMAINS)
    return [o for o in origins if o]


def require_env(keys: list[str]) -> None:
    missing = [k for k in keys if not os.getenv(k)]
    if missing:
        raise RuntimeError(
            f"Missing required environment variables: {', '.join(missing)}"
        )

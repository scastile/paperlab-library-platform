"""
Rate limiter middleware for FastAPI — sliding window per user_id.

Usage:
    from rate_limit import RateLimiterMiddleware, rate_limiter

    app.add_middleware(RateLimiterMiddleware)

    # In a route handler:
    from rate_limit import rate_limiter

    @app.post("/credits/deduct")
    async def deduct(req: DeductRequest, user_id: str = Depends(get_current_user)):
        ok, msg = await rate_limiter.check("deduct", user_id, max_requests=10, window_seconds=60)
        if not ok:
            raise HTTPException(429, msg)
        ...
"""
import time
from collections import defaultdict
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.responses import JSONResponse


class SlidingWindowLimiter:
    """Per-key sliding window rate limiter (in-memory, single-process)."""

    def __init__(self):
        # key -> list of timestamps
        self._windows: dict[str, list[float]] = defaultdict(list)

    async def check(
        self,
        key: str,
        max_requests: int = 30,
        window_seconds: int = 60,
    ) -> tuple[bool, str]:
        """Return (allowed, message)."""
        now = time.time()
        cutoff = now - window_seconds
        # Prune old entries
        self._windows[key] = [t for t in self._windows[key] if t > cutoff]
        if len(self._windows[key]) >= max_requests:
            remaining = window_seconds - int(now - self._windows[key][0])
            return False, f"Rate limit exceeded. Try again in {remaining}s."
        self._windows[key].append(now)
        return True, ""


rate_limiter = SlidingWindowLimiter()


# ── Middleware for automatic IP-based throttling on all routes ──────────

class RateLimiterMiddleware(BaseHTTPMiddleware):
    """Reject abusive IPs before they hit a single route.

    Default: 120 requests/minute per IP across the whole app.
    Bypass: add ``X-Rate-Bypass: <token>`` header for trusted internal calls.
    """
    def __init__(self, app, max_requests: int = 120, window_seconds: int = 60):
        super().__init__(app)
        self._limiter = SlidingWindowLimiter()
        self._max = max_requests
        self._window = window_seconds

    async def dispatch(self, request, call_next):
        # Extract client IP (behind reverse proxy)
        ip = request.client.host if request.client else "unknown"
        # Internal calls with bypass token skip rate limiting
        bypass = request.headers.get("X-Rate-Bypass", "")
        if bypass == "paperlab-internal":
            return await call_next(request)

        ok, msg = await self._limiter.check(f"ip:{ip}", self._max, self._window)
        if not ok:
            return JSONResponse(status_code=429, content={"error": msg})
        return await call_next(request)

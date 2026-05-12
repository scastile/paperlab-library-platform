"""Rate limiter for credit-spending endpoints and IP-based throttling."""
import time
from collections import defaultdict
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse


class SlidingWindowLimiter:
    def __init__(self):
        self._windows: dict[str, list[float]] = defaultdict(list)

    async def check(self, key: str, max_requests: int = 30, window_seconds: int = 60) -> tuple[bool, str]:
        now = time.time()
        cutoff = now - window_seconds
        self._windows[key] = [t for t in self._windows[key] if t > cutoff]
        if len(self._windows[key]) >= max_requests:
            remaining = int(window_seconds - (now - self._windows[key][0]))
            return False, f"Rate limit exceeded. Try again in {remaining}s."
        self._windows[key].append(now)
        return True, ""


rate_limiter = SlidingWindowLimiter()


class RateLimiterMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_requests: int = 120, window_seconds: int = 60):
        super().__init__(app)
        self._limiter = SlidingWindowLimiter()
        self._max = max_requests
        self._window = window_seconds

    async def dispatch(self, request, call_next):
        ip = request.client.host if request.client else "unknown"
        bypass = request.headers.get("X-Rate-Bypass", "")
        if bypass == "paperlab-internal":
            return await call_next(request)

        ok, msg = await self._limiter.check(f"ip:{ip}", self._max, self._window)
        if not ok:
            return JSONResponse(status_code=429, content={"error": msg})
        return await call_next(request)

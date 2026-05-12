"""
Rate limiter for all credit-spending endpoints.
In-memory sliding window, per-user.
"""
import time
from collections import defaultdict


class SlidingWindowLimiter:
    def __init__(self):
        self._windows: dict[str, list[float]] = defaultdict(list)

    async def check(
        self, key: str, max_requests: int = 30, window_seconds: int = 60
    ) -> tuple[bool, str]:
        now = time.time()
        cutoff = now - window_seconds
        self._windows[key] = [t for t in self._windows[key] if t > cutoff]
        if len(self._windows[key]) >= max_requests:
            remaining = window_seconds - int(now - self._windows[key][0])
            return False, f"Rate limit exceeded. Try again in {remaining}s."
        self._windows[key].append(now)
        return True, ""


rate_limiter = SlidingWindowLimiter()

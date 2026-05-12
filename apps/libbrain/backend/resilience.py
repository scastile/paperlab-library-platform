"""
Resilience layer — Circuit breaker + provider chain with retry.
Key feature for TrueFoundry sponsor challenge ($500 prize).
BYOK (Bring Your Own Key) only — no env var fallback.
"""

import asyncio
import logging
import time
import httpx
from providers.base import LLMProvider
from providers.mimo import MiMoProvider
from providers.openrouter import OpenRouterProvider
from providers.claude import ClaudeProvider
from providers.chatgpt import ChatGPTProvider
from providers.nous import NousProvider
from providers.nvidia import NvidiaProvider
from providers.gemini import GeminiProvider

logger = logging.getLogger("libbrain.resilience")

DEGRADATION_MSG = (
    "I'm having trouble connecting right now. "
    "Please try again in a moment or ask a librarian for help."
)

PROVIDER_REGISTRY = {
    "mimo": {
        "name": "MiMo",
        "cls": MiMoProvider,
        "supports_tts": True,
    },
    "openrouter": {
        "name": "OpenRouter",
        "cls": OpenRouterProvider,
        "supports_tts": False,
    },
    "claude": {
        "name": "Claude",
        "cls": ClaudeProvider,
        "supports_tts": False,
    },
    "chatgpt": {
        "name": "ChatGPT",
        "cls": ChatGPTProvider,
        "supports_tts": False,
    },
    "nous": {
        "name": "Nous Research",
        "cls": NousProvider,
        "supports_tts": False,
    },
    "nvidia": {
        "name": "NVIDIA",
        "cls": NvidiaProvider,
        "supports_tts": False,
    },
    "gemini": {
        "name": "Gemini",
        "cls": GeminiProvider,
        "supports_tts": False,
    },
}


class CircuitBreaker:
    """Tracks failures per provider. Opens after 3 consecutive failures, 60s cooldown."""

    def __init__(self, name: str, failure_threshold: int = 3, cooldown: float = 60.0):
        self.name = name
        self.failure_threshold = failure_threshold
        self.cooldown = cooldown
        self.failures = 0
        self.last_failure_time = 0.0
        self.state = "closed"

    def record_success(self):
        self.failures = 0
        self.state = "closed"

    def record_failure(self):
        self.failures += 1
        self.last_failure_time = time.time()
        if self.failures >= self.failure_threshold:
            self.state = "open"
            logger.warning(f"Circuit breaker OPEN for {self.name}")

    def is_available(self) -> bool:
        if self.state == "closed":
            return True
        if self.state == "open":
            elapsed = time.time() - self.last_failure_time
            if elapsed >= self.cooldown:
                self.state = "half_open"
                logger.info(f"Circuit breaker HALF-OPEN for {self.name}")
                return True
            return False
        return True

    def status(self) -> dict:
        return {
            "state": self.state,
            "failures": self.failures,
            "available": self.is_available(),
        }


class ProviderChain:
    """Dynamically builds provider chain from settings (BYOK only)."""

    def __init__(self):
        self.breakers: dict[str, CircuitBreaker] = {}
        self._settings_cache = None
        self._cache_time = 0
        self._cache_ttl = 5

    async def _get_providers(self) -> list[tuple[str, LLMProvider, CircuitBreaker]]:
        """Build ordered provider list from settings (BYOK only)."""
        import time as t

        now = t.time()
        if self._settings_cache is None or (now - self._cache_time) > self._cache_ttl:
            try:
                from database import get_all_settings
                self._settings_cache = await get_all_settings()
                self._cache_time = now
            except Exception:
                self._settings_cache = {}

        settings = self._settings_cache or {}
        primary = settings.get("primary_provider", "mimo")

        providers = []
        seen = set()
        provider_order = [primary] + [k for k in PROVIDER_REGISTRY if k != primary]

        for key in provider_order:
            if key in seen:
                continue
            seen.add(key)

            reg = PROVIDER_REGISTRY[key]
            # BYOK only — read from settings, no env var fallback
            api_key = settings.get(f"{key}_api_key", "")
            if not api_key:
                continue

            custom_model = settings.get(f"{key}_model", "")

            try:
                if custom_model:
                    provider = reg["cls"](api_key=api_key, model=custom_model)
                else:
                    provider = reg["cls"](api_key=api_key)
            except TypeError:
                provider = reg["cls"](api_key=api_key)

            if key not in self.breakers:
                self.breakers[key] = CircuitBreaker(key)

            providers.append((key, provider, self.breakers[key]))

        return providers

    def _available_providers(self, providers):
        return [(n, p, cb) for n, p, cb in providers if cb.is_available()]

    async def _retry(self, coro_factory, max_attempts: int = 3):
        last_exc = None
        for attempt in range(max_attempts):
            try:
                return await coro_factory()
            except httpx.TimeoutException as e:
                last_exc = e
                delay = 2 ** attempt
                logger.warning(f"Attempt {attempt + 1} timed out: {e}. Retrying in {delay}s...")
                await asyncio.sleep(delay)
            except httpx.HTTPStatusError as e:
                last_exc = e
                if e.response.status_code < 500:
                    raise
                delay = 2 ** attempt
                logger.warning(f"Attempt {attempt + 1} HTTP {e.response.status_code}. Retrying in {delay}s...")
                await asyncio.sleep(delay)
            except Exception as e:
                last_exc = e
                break
        raise last_exc

    async def chat(self, messages: list[dict], model: str = None) -> str:
        providers = await self._get_providers()
        if not providers:
            return "No AI provider configured. Please add an API key in the staff settings."
        for name, provider, cb in self._available_providers(providers):
            try:
                result = await self._retry(lambda p=provider: p.chat(messages, model))
                cb.record_success()
                return result
            except Exception as e:
                cb.record_failure()
                logger.error(f"Provider {name} failed: {e}")
                continue
        return DEGRADATION_MSG

    async def classify(self, text: str) -> str:
        providers = await self._get_providers()
        if not providers:
            return "general"
        for name, provider, cb in self._available_providers(providers):
            try:
                result = await self._retry(lambda p=provider: p.classify(text))
                cb.record_success()
                return result
            except Exception as e:
                cb.record_failure()
                logger.error(f"Provider {name} classify failed: {e}")
                continue
        return "general"

    async def tts(self, text: str) -> bytes | None:
        providers = await self._get_providers()
        for name, provider, cb in self._available_providers(providers):
            try:
                result = await provider.tts(text)
                if result:
                    cb.record_success()
                    return result
            except Exception as e:
                cb.record_failure()
                logger.error(f"Provider {name} TTS failed: {e}")
                continue
        return None

    def get_status(self) -> dict:
        return {name: cb.status() for name, cb in self.breakers.items()}


# Singleton instance
provider_chain = ProviderChain()

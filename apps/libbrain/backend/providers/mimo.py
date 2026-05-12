import os
import httpx
from providers.base import LLMProvider


class MiMoProvider(LLMProvider):
    """MiMo API provider — OpenAI-compatible chat + TTS."""

    BASE_URL = "https://token-plan-sgp.xiaomimimo.com/v1"

    def __init__(self, api_key: str = "", model: str = ""):
        self.api_key = api_key or os.getenv("MIMO_API_KEY", "")
        self.default_model = model or "mimo-v2.5-pro"

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    async def chat(self, messages: list[dict], model: str = None) -> str:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self.BASE_URL}/chat/completions",
                headers=self._headers(),
                json={
                    "model": model or self.default_model,
                    "messages": messages,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]

    async def classify(self, text: str) -> str:
        messages = [
            {
                "role": "system",
                "content": (
                    "Classify this library patron question into exactly one category. "
                    "Return ONLY the category word. "
                    "Categories: reference, general, directional, readers_advisory, tech_help"
                ),
            },
            {"role": "user", "content": text},
        ]
        result = await self.chat(messages)
        return result.strip().lower()

    async def tts(self, text: str) -> bytes | None:
        if not self.api_key:
            return None
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self.BASE_URL}/audio/speech",
                headers=self._headers(),
                json={
                    "model": "tts-1",
                    "input": text,
                    "voice": "alloy",
                },
            )
            if resp.status_code != 200:
                return None
            return resp.content

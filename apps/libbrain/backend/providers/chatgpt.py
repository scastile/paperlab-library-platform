import httpx
from providers.base import LLMProvider


class ChatGPTProvider(LLMProvider):
    """OpenAI ChatGPT API provider — chat + classify, no TTS."""

    BASE_URL = "https://api.openai.com/v1"

    def __init__(self, api_key: str, model: str = "gpt-4o-mini"):
        self.api_key = api_key
        self.default_model = model

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    async def chat(self, messages: list[dict], model: str = None) -> str:
        async with httpx.AsyncClient(timeout=60) as client:
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
        return result.strip().lower().split()[0]

    async def tts(self, text: str) -> bytes | None:
        return None

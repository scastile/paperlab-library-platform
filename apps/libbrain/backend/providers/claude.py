import httpx
from providers.base import LLMProvider


class ClaudeProvider(LLMProvider):
    """Anthropic Claude API provider — chat + classify, no TTS."""

    BASE_URL = "https://api.anthropic.com/v1"

    def __init__(self, api_key: str, model: str = "claude-sonnet-4-20250514"):
        self.api_key = api_key
        self.default_model = model

    def _headers(self) -> dict:
        return {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }

    async def chat(self, messages: list[dict], model: str = None) -> str:
        # Convert OpenAI format to Anthropic format
        system = ""
        claude_messages = []
        for msg in messages:
            if msg["role"] == "system":
                system = msg["content"]
            else:
                claude_messages.append(msg)

        body = {
            "model": model or self.default_model,
            "max_tokens": 2048,
            "messages": claude_messages,
        }
        if system:
            body["system"] = system

        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                f"{self.BASE_URL}/messages",
                headers=self._headers(),
                json=body,
            )
            resp.raise_for_status()
            data = resp.json()
            return data["content"][0]["text"]

    async def classify(self, text: str) -> str:
        messages = [
            {"role": "user", "content": (
                "Classify this library patron question into exactly one category. "
                "Return ONLY the category word. "
                "Categories: reference, general, directional, readers_advisory, tech_help\n\n"
                f"Question: {text}"
            )},
        ]
        result = await self.chat(messages)
        return result.strip().lower().split()[0]  # Take first word only

    async def tts(self, text: str) -> bytes | None:
        return None

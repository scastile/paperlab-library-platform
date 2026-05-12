import httpx
from providers.base import LLMProvider


class GeminiProvider(LLMProvider):
    """Google Gemini API provider."""

    BASE_URL = "https://generativelanguage.googleapis.com/v1beta"

    def __init__(self, api_key: str = "", model: str = ""):
        self.api_key = api_key
        self.default_model = model or "gemini-2.5-flash"

    async def chat(self, messages: list[dict], model: str = None) -> str:
        # Convert OpenAI format to Gemini format
        gemini_contents = []
        system_instruction = None

        for msg in messages:
            if msg["role"] == "system":
                system_instruction = {"parts": [{"text": msg["content"]}]}
            else:
                role = "model" if msg["role"] == "assistant" else "user"
                gemini_contents.append({
                    "role": role,
                    "parts": [{"text": msg["content"]}],
                })

        body = {"contents": gemini_contents}
        if system_instruction:
            body["systemInstruction"] = system_instruction

        model_name = model or self.default_model
        url = f"{self.BASE_URL}/models/{model_name}:generateContent?key={self.api_key}"

        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(url, json=body)
            resp.raise_for_status()
            data = resp.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]

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
        return result.strip().lower().split()[0]

    async def tts(self, text: str) -> bytes | None:
        return None

"""LLM clue generation + news briefing via OpenRouter.

The LLM never constructs the grid — it only:
1. Turns a raw headline list into a short "today's news" briefing (shown on the
   crossword page as context).
2. Writes one clue per placed answer word, with the day's headlines provided
   so clues can lean on actual news context.

Uses google/gemini-2.5-flash by default (cheap, fast, good at constrained
writing). Model overridable via OPENROUTER_MODEL env.
"""
import json
import os
import re

import httpx

BASE_URL = "https://openrouter.ai/api/v1"
DEFAULT_MODEL = "google/gemini-2.5-flash"


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {os.getenv('OPENROUTER_API_KEY', '')}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://paperlab.xyz",
        "X-Title": "PaperLab Daily Crossword",
    }


async def chat(messages: list[dict], model: str | None = None, timeout: float = 60.0) -> str:
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post(
            f"{BASE_URL}/chat/completions",
            headers=_headers(),
            json={"model": model or os.getenv("OPENROUTER_MODEL", DEFAULT_MODEL), "messages": messages},
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]


async def generate_briefing(headlines: list[dict]) -> str:
    """Short 'what happened today' briefing from raw headlines."""
    sample = "\n".join(f"- [{h['source']}] {h['title']}" for h in headlines[:12])
    messages = [
        {
            "role": "system",
            "content": (
                "You write crisp, neutral news briefings. 4-6 short bullet points, "
                "plain text, no markdown headers, no intro line. Cover the biggest "
                "stories. Each bullet under 180 characters."
            ),
        },
        {"role": "user", "content": f"Today's headlines:\n{sample}\n\nWrite the briefing:"},
    ]
    try:
        return (await chat(messages)).strip()
    except Exception:
        # Fallback: raw top headlines as the briefing
        return "\n".join(f"- {h['title']}" for h in headlines[:6])


async def generate_clues(words: list[str], headlines: list[dict]) -> dict[str, str]:
    """One clue per word. Returns {WORD: clue}. Falls back to a plain
    definition-style clue if the LLM call fails or returns garbage."""
    context = "\n".join(f"- [{h['source']}] {h['title']}" for h in headlines[:10])
    prompt = (
        f"Today's news context:\n{context}\n\n"
        f"Write crossword clues for these {len(words)} answer words: {', '.join(words)}.\n"
        "Rules:\n"
        "- One clue per word, keyed by the uppercase word.\n"
        "- Clues must be clever and news-aware where possible, but fair for someone who does not follow the news.\n"
        "- Never include the answer word itself in its clue (no 'sounds like' unless obvious).\n"
        "- Return ONLY a JSON object: {\"WORD\": \"clue\", ...}.\n"
        "- Clue length: 4 to 14 words."
    )
    messages = [
        {"role": "system", "content": "You are a crossword constructor. Return only valid JSON."},
        {"role": "user", "content": prompt},
    ]
    try:
        raw = (await chat(messages)).strip()
        obj = _extract_json(raw)
        if isinstance(obj, dict):
            out = {k.upper(): str(v).strip() for k, v in obj.items() if str(v).strip()}
            if out:
                return out
    except Exception:
        pass
    # Fallback clues — plain definitions from the words themselves.
    return {w: f"News term: {w.title()}" for w in words}


def _extract_json(raw: str) -> dict | None:
    """Pull the first JSON object out of an LLM response (tolerates fences)."""
    raw = raw.strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```[a-zA-Z]*\n?", "", raw)
        raw = re.sub(r"\n?```$", "", raw)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass
    m = re.search(r"\{.*\}", raw, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(0))
        except json.JSONDecodeError:
            return None
    return None

import os
import json
import httpx

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
AI_MODEL = os.getenv("AI_MODEL", "google/gemini-2.5-flash-lite")

SYSTEM_PROMPT = """You are a senior graphic designer and copywriter specializing in library event marketing. You create compelling, concise flyer copy that gets people to attend events.

Return ONLY a JSON object with these keys:
- headline: A bold, attention-grabbing headline (3-8 words)
- body_text: A short, engaging description (1-2 sentences, max 25 words)
- cta_text: A clear call-to-action (e.g., "Register Today", "Join Us", "Free Admission")
- image_prompt: A detailed prompt for AI image generation describing a suitable background image (no text in the image, just visuals)
- color_suggestion: A hex color that matches the vibe (e.g., "#6366f1")

Rules:
- Keep everything punchy and actionable
- Headline should be exciting but appropriate for a library
- Body text should mention who the event is for and what they'll get out of it
- The image prompt should describe a clean, professional background suitable for text overlay
- Never include explanatory text outside the JSON
"""

async def generate_flyer_content(event_name: str, description: str, theme: str, audience: str, vibe: str, date: str, time: str, location: str) -> dict:
    user_msg = f"""Create flyer copy for this library event:

Event Name: {event_name}
Description: {description or "No description provided"}
Theme: {theme or "General"}
Target Audience: {audience}
Vibe/Mood: {vibe}
Date: {date or "TBD"}
Time: {time or "TBD"}
Location: {location or "TBD"}

Generate headline, body, CTA, and an image generation prompt."""

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://lib.paperlab.xyz",
                "X-Title": "Event Flyer Studio"
            },
            json={
                "model": AI_MODEL,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_msg}
                ],
                "max_tokens": 1500,
                "temperature": 0.7
            },
            timeout=60.0
        )
    
    if resp.status_code != 200:
        raise RuntimeError(f"OpenRouter error {resp.status_code}: {resp.text[:500]}")
    
    data = resp.json()
    content = data["choices"][0]["message"]["content"]
    
    # Strip markdown code fences if present
    content = content.strip()
    if content.startswith("```json"):
        content = content[7:]
    if content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]
    content = content.strip()
    
    try:
        result = json.loads(content)
    except json.JSONDecodeError:
        # Attempt basic salvage
        fixed = content
        if fixed.count('"') % 2 == 1:
            fixed += '"'
        for _ in range(fixed.count('{') - fixed.count('}')):
            fixed += '}'
        result = json.loads(fixed)
    
    return {
        "headline": result.get("headline", event_name),
        "body_text": result.get("body_text", description or ""),
        "cta_text": result.get("cta_text", "Join Us"),
        "image_prompt": result.get("image_prompt", f"A professional background for a {vibe} library event about {theme}"),
        "color_suggestion": result.get("color_suggestion", "#6366f1")
    }

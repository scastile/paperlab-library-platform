import os
import json
import httpx

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
AI_MODEL = os.getenv("AI_MODEL", "google/gemini-2.5-flash")

SYSTEM_PROMPT = """You are an expert marketing copywriter and visual designer who specializes in library and community event promotion. Your flyers get noticed and drive attendance.

Return ONLY a JSON object with these keys:
- headline: Bold, specific, and exciting (4-10 words). Avoid generic phrases like "Join Us For" or "Come To Our". Lead with the benefit or the hook.
- body_text: 2-4 sentences, 40-70 words. Explain who this is for, what they'll do, and what they'll walk away with. Use active voice. No filler.
- cta_text: Action-oriented and urgent (2-4 words). Examples: "Save Your Spot", "Register Free", "Drop In", "Grab a Seat".
- image_prompt: A detailed, vivid description for an AI image generator. Describe the setting, mood, lighting, colors, and key visual elements. CRITICAL: Specify the image should have a blurred or gradient background with empty space on the left or center where text will be overlaid. No text, no letters, no words in the image.
- color_suggestion: A single hex color that matches the event mood. Choose from these proven palette anchors:
  - Warm/energetic: #e85d04, #f4a261, #e9c46a
  - Cool/calm: #2a9d8f, #264653, #4361ee
  - Playful/creative: #f72585, #7209b7, #4cc9f0
  - Community/wholesome: #606c38, #283618, #dda15e

Rules:
- Headlines must be specific. "Robot Coding for Teens" beats "Teen Tech Event".
- Body text must answer: Who is this for? What happens? Why should they care?
- Image prompt must describe lighting (soft natural, dramatic spotlight, warm golden hour) and composition (shallow depth of field, negative space for text).
- Never include explanatory text outside the JSON.

Example of good output:
{
  "headline": "Build a Robot From Scrap",
  "body_text": "Teens ages 13-17 will solder circuits, attach motors, and program their own mini bots to navigate a maze. No experience needed — all parts provided.",
  "cta_text": "Claim Your Kit",
  "image_prompt": "A close-up of a teenager's hands soldering a small circuit board on a wooden workbench, warm workshop lighting, shallow depth of field, soft bokeh background with empty space on the left side for text overlay, no text in image, warm amber and steel blue tones, photorealistic",
  "color_suggestion": "#e85d04"
}
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

Generate headline, body, CTA, and an image generation prompt. Make it feel like a real event people would clear their schedule for."""

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://flyer.paperlab.xyz",
                "X-Title": "Event Flyer Studio"
            },
            json={
                "model": AI_MODEL,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_msg}
                ],
                "max_tokens": 1500,
                "temperature": 0.8
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

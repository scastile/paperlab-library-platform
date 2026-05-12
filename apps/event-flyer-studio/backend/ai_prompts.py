import os
import json
import httpx

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
AI_MODEL = os.getenv("AI_MODEL", "google/gemini-3.1-flash-image-preview")

# Layout-aware composition instructions for the image generator.
# Each layout places text in a different zone, so the background MUST
# have negative space in that exact zone.
LAYOUT_COMPOSITION = {
    "poster": {
        "zone": "lower center and bottom third",
        "subject_position": "upper half or off-center top",
        "lighting_note": "soft gradient or atmospheric haze in the lower area, brighter or more detailed above",
        "instruction": (
            "The main visual subject should occupy the upper half of the frame, "
            "leaving the bottom third as a calm, gently blurred or gradient zone with minimal detail. "
            "This creates a natural canvas for centered text overlay."
        ),
        "geometric_rule": (
            "Compositional focus on the bottom edge. "
            "The top 60% of the image must be clean, solid, or softly blurred negative space. "
            "The main subject is anchored to the upper third only."
        ),
    },
    "modern": {
        "zone": "left side and upper-left quadrant",
        "subject_position": "right side, lower right, or fading toward the right edge",
        "lighting_note": "clean, even lighting with subtle shadow depth on the right",
        "instruction": (
            "The main visual subject should be positioned toward the right side or lower right, "
            "leaving the left edge and upper-left quadrant as clean negative space. "
            "The left side should be uncluttered, smooth, and slightly darker or neutral "
            "to ensure crisp white text readability."
        ),
        "geometric_rule": (
            "Subject anchored to the right half of the frame. "
            "Use a horizontal gradient fade toward the left for text readability. "
            "The left 50% of the frame must remain empty, flat-color, or out-of-focus."
        ),
    },
    "social": {
        "zone": "center",
        "subject_position": "edges, corners, or framing the perimeter",
        "lighting_note": "even, soft lighting with subtle vignette",
        "instruction": (
            "The main visual elements should frame the edges or corners of the square, "
            "leaving a large, clear empty space in the center. "
            "The center should be smooth, low-detail, and slightly muted so centered text pops clearly."
        ),
        "geometric_rule": (
            "Visual elements frame the edges and corners only. "
            "The center 50% of the square must remain an empty, flat-color or out-of-focus background. "
            "Center area must be low-detail and muted."
        ),
    },
}

# Vibe-specific visual descriptors added to every image prompt.
# These ensure the background matches the emotional tone AND keeps
# text-safe zones clear.
VIBE_DESCRIPTORS = {
    "Whimsical": {
        "style": "whimsical storybook illustration with soft watercolor textures and gentle ink outlines",
        "colors": "pastel pinks, lavender, mint green, and buttery yellow",
        "mood": "dreamy, playful, and inviting",
        "detail": "scattered floating elements like petals, sparkles, or small creatures at the periphery, never in the text zone",
    },
    "Modern & Sleek": {
        "style": "minimalist high-contrast commercial photography with crisp lines and geometric elements",
        "colors": "deep navy, charcoal, silver, and electric accent tones",
        "mood": "confident, clean, and contemporary",
        "detail": "subtle grain texture, architectural lines, or abstract light refractions",
    },
    "Vintage Scholastic": {
        "style": "warm analog photography with film grain, sepia undertones, and aged paper texture",
        "colors": "ochre, burnt sienna, forest green, and cream",
        "mood": "nostalgic, scholarly, and timeless",
        "detail": "soft vignette, library shelves, vintage typewriter keys, or old maps softly blurred in the background",
    },
    "High-Energy": {
        "style": "dynamic action photography with motion blur, dramatic angles, and bold graphic elements",
        "colors": "vivid oranges, hot pinks, electric blues, and high-contrast blacks",
        "mood": "explosive, exciting, and urgent",
        "detail": "diagonal light streaks, particles, or speed lines at the edges; sharp focus on a central action moment",
    },
    "Calm & Relaxing": {
        "style": "serene landscape or still-life photography with shallow depth of field",
        "colors": "sage green, dusty blue, warm sand, and soft white",
        "mood": "peaceful, grounding, and restorative",
        "detail": "gentle bokeh circles, soft natural light through windows, or tranquil water reflections",
    },
    "Festive": {
        "style": "bright cheerful photography with colorful decorative accents",
        "colors": "warm gold, coral, teal, and sunshine yellow",
        "mood": "joyful, welcoming, and celebratory",
        "detail": "balloons, streamers, or colorful banners at the edges framing the scene without entering the text zone",
    },
}

SYSTEM_PROMPT = """You are an expert marketing copywriter and visual designer who specializes in library and community event promotion. Your flyers get noticed and drive attendance.

Return ONLY a JSON object with these exact top-level keys — do not nest them:

{
  "headline": "Bold, specific, and exciting (4-10 words)",
  "body_text": "2-4 sentences, 40-70 words",
  "cta_text": "Action-oriented and urgent (2-4 words)",
  "image_prompt": "A detailed vivid narrative paragraph for an AI image generator",
  "color_suggestion": "#hexcolor"
}

Rules:
- Headlines must be specific. "Robot Coding for Teens" beats "Teen Tech Event". Avoid generic phrases like "Join Us For" or "Come To Our".
- Body text must answer: Who is this for? What happens? Why should they care? Use active voice. No filler.
- CTA examples: "Save Your Spot", "Register Free", "Drop In", "Grab a Seat".
- Image prompt must be a descriptive paragraph. Mention camera angle, lighting, depth of field, and the exact negative space zone ({layout_zone}). No text, no letters, no words in the image.
- Color suggestion from: #e85d04, #f4a261, #e9c46a, #2a9d8f, #264653, #4361ee, #f72585, #7209b7, #4cc9f0, #606c38, #283618, #dda15e
- Never include explanatory text outside the JSON. Use the exact keys above — NOT nested objects.
"""


def _build_image_prompt(vibe: str, layout: str, event_name: str, theme: str) -> str:
    """Build a layout-aware, vibe-aware narrative image prompt."""
    comp = LAYOUT_COMPOSITION.get(layout, LAYOUT_COMPOSITION["poster"])
    desc = VIBE_DESCRIPTORS.get(vibe, VIBE_DESCRIPTORS["Modern & Sleek"])

    subject = theme or event_name or "community event"

    # Narrative paragraph — put the SUBJECT first, style second.
    # The image model weighs opening phrases heaviest.
    prompt = (
        f"A professional background photograph depicting {subject}. "
        f"The scene captures the energy and subject matter of {subject}, "
        f"rendered in a {desc['style']} style with {desc['colors']} tones. "
        f"The mood is {desc['mood']}. {desc['detail']}. "
        f"{comp['geometric_rule']} "
        f"Lighting should be {comp['lighting_note']}. "
        f"No text, no letters, no words, no watermarks in the image."
    )
    return prompt


def _extract_flyer_keys(data: dict) -> dict:
    """Robustly extract the 5 required flyer JSON keys from the AI response.

    The model frequently nests keys under `flyer_copy`, `content`, `design`, etc.
    This recursively drills into dicts until it finds the flat key set we need.
    Falls back to partial match if no complete set is found.
    """
    TARGET_KEYS = {"headline", "body_text", "cta_text", "image_prompt", "color_suggestion"}
    BEST = {"best": {}}  # mutable closure for partial fallback

    def _score(obj):
        """Return number of target keys found in this dict."""
        if not isinstance(obj, dict):
            return 0
        return len(TARGET_KEYS & set(obj.keys()))

    def _search(obj):
        if isinstance(obj, dict):
            score = _score(obj)
            # Keep the best partial match as fallback
            if score > _score(BEST["best"]):
                BEST["best"] = {k: obj[k] for k in TARGET_KEYS if k in obj}
            if score == len(TARGET_KEYS):
                return {k: obj[k] for k in TARGET_KEYS}
            for v in obj.values():
                found = _search(v)
                if found:
                    return found
        elif isinstance(obj, list):
            for item in obj:
                found = _search(item)
                if found:
                    return found
        return None

    return _search(data) or BEST["best"]


def _merge_keys(data: dict, event_name: str, description: str) -> dict:
    """Extract keys with smart fallbacks."""
    extracted = _extract_flyer_keys(data)
    headline = extracted.get("headline")
    if not headline or len(headline.strip()) < 2:
        headline = event_name or "Event"
    body_text = extracted.get("body_text")
    if not body_text or len(body_text.strip()) < 2:
        body_text = description or ""
    cta_text = extracted.get("cta_text")
    if not cta_text or len(cta_text.strip()) < 2:
        cta_text = "Join Us"
    return {
        "headline": headline,
        "body_text": body_text,
        "cta_text": cta_text,
        "image_prompt": extracted.get("image_prompt", ""),
        "color_suggestion": extracted.get("color_suggestion", "#6366f1"),
    }


async def generate_flyer_content(
    event_name: str,
    description: str,
    theme: str,
    audience: str,
    vibe: str,
    date: str,
    time: str,
    location: str,
    layout: str = "poster",
) -> dict:
    comp = LAYOUT_COMPOSITION.get(layout, LAYOUT_COMPOSITION["poster"])

    # Build a layout-aware user message so the model knows WHERE text will sit.
    user_msg = f"""Create flyer copy for this library event:

Event Name: {event_name}
Description: {description or "No description provided"}
Theme: {theme or "General"}
Target Audience: {audience}
Vibe/Mood: {vibe}
Date: {date or "TBD"}
Time: {time or "TBD"}
Location: {location or "TBD"}
Layout: {layout}

CRITICAL — the flyer will use the "{layout}" layout. That means headline, body, and CTA text will be placed in the {comp['zone']}.
Therefore the image_prompt MUST describe a background that has significant empty space in the {comp['zone']}.

Generate headline, body, CTA, and an image generation prompt. Make it feel like a real event people would clear their schedule for.
Return ONLY a flat JSON object with top-level keys: headline, body_text, cta_text, image_prompt, color_suggestion."""

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://flyer.paperlab.xyz",
                "X-Title": "Event Flyer Studio",
            },
            json={
                "model": AI_MODEL,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_msg},
                ],
                "max_tokens": 1500,
                "temperature": 0.8,
            },
            timeout=60.0,
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
        parsed = json.loads(content)
    except json.JSONDecodeError:
        # Attempt basic salvage
        fixed = content
        if fixed.count('"') % 2 == 1:
            fixed += '"'
        for _ in range(fixed.count("{") - fixed.count("}")):
            fixed += "}"
        parsed = json.loads(fixed)

    # Extract keys from whatever shape the AI returned
    result = _merge_keys(parsed, event_name, description)

    # If the model ignored the layout instruction, override with our engineered prompt.
    raw_prompt = result.get("image_prompt", "")
    if comp["zone"] not in raw_prompt.lower():
        raw_prompt = _build_image_prompt(vibe, layout, event_name, theme)

    return {
        "headline": result["headline"],
        "body_text": result["body_text"],
        "cta_text": result["cta_text"],
        "image_prompt": raw_prompt,
        "color_suggestion": result.get("color_suggestion", "#6366f1"),
    }

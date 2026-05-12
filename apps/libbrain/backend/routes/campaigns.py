import json
import logging
from fastapi import APIRouter, Depends
from routes.staff import _verify_token
from fastapi import Header, HTTPException
from database import get_db
from models import CampaignRequest, CampaignResponse, PlatformContent
from resilience import provider_chain

logger = logging.getLogger("libbrain.campaigns")

async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing token")
    user_id = _verify_token(authorization.split(" ", 1)[1])
    if not user_id:
        raise HTTPException(401, "Invalid or expired token")
    return user_id

router = APIRouter()

STYLE_GUIDE = {
    "formal": "Write in a professional, polished tone suitable for official library communications. Use proper structure with clear headings.",
    "playful": "Use fun, energetic language with emojis, puns, and excitement. Great for kids and family events.",
    "educational": "Focus on learning value, facts, and enrichment. Include takeaways and why it matters.",
    "seasonal": "Tie into the current season/holiday. Use seasonal imagery and timely references.",
    "social_media": "Write platform-specific social media posts. Each platform has different character limits, tone, and hashtag conventions.",
    "newsletter": "Write a newsletter-ready section with a headline, 2-3 short paragraphs, and a call to action. Professional but warm.",
    "event_announcement": "Create an event announcement with: catchy headline, what/when/where details, why attend, and RSVP info. Use excitement!",
    "shelf_talker": "Write a short shelf talker (2-3 sentences) — a mini book-recommendation style blurb that would sit on a library shelf. First person, enthusiastic, conversational.",
    "email_blast": "Write an email with: compelling subject line, preview text, greeting, body (3-4 short paragraphs), clear CTA button text, and sign-off. Keep scannable.",
    "bulletin_board": "Create content for a physical bulletin board: bold headline, 3-5 bullet points, eye-catching phrases, and a tear-off strip text at the bottom.",
    "flyer": "Create flyer copy: bold headline, subheadline, 3 key details as bullet points, a quote/testimonial placeholder, and footer with date/location/website.",
    "infographic": "Create text for an infographic: a title, 4-5 data points or facts with short labels, a takeaway line, and a source note. Keep each point to one line.",
    "blog_post": "Write a blog post (300-400 words) with an engaging title, hook opening, 2-3 sections with subheadings, and a closing CTA. Conversational but informative. Include a meta description at the top.",
}

SOCIAL_PLATFORMS = {
    "twitter": {
        "name": "Twitter / X",
        "limit": 280,
        "instructions": (
            "Write a single tweet. Max 280 characters. "
            "Use 1-2 relevant hashtags. Punchy, conversational, maybe a hook question. "
            "No thread — just one tweet."
        ),
    },
    "instagram": {
        "name": "Instagram",
        "limit": 2200,
        "instructions": (
            "Write an Instagram caption. Start with a hook line (first line is what people see). "
            "Use 3-5 relevant hashtags at the end. Include a CTA (save, share, visit). "
            "Friendly and visual — describe what people would see."
        ),
    },
    "facebook": {
        "name": "Facebook",
        "limit": 500,
        "instructions": (
            "Write a Facebook post. Conversational, community-focused. "
            "Can be longer than Twitter but keep it scannable. "
            "Include a question to drive engagement. No hashtag overload — 1-2 max."
        ),
    },
    "linkedin": {
        "name": "LinkedIn",
        "limit": 700,
        "instructions": (
            "Write a LinkedIn post. Professional but approachable tone. "
            "Focus on community impact, education value, or professional relevance. "
            "Use line breaks for readability. End with a question or call to action."
        ),
    },
}

IMAGE_PROMPT_TEMPLATE = (
    "For each platform, write a detailed image generation prompt that would create "
    "a compelling visual for this campaign. The prompt should be descriptive enough "
    "for an AI image generator (like DALL-E, Midjourney, or Stable Diffusion). "
    "Include: subject, style, colors, mood, composition, and text overlay suggestions. "
    "Tailor the aspect ratio suggestion to each platform:\n"
    "- Twitter: 1200x675 (landscape)\n"
    "- Instagram: 1080x1080 (square) or 1080x1350 (portrait)\n"
    "- Facebook: 1200x630 (landscape)\n"
    "- LinkedIn: 1200x627 (landscape)\n"
    "Keep each prompt under 200 words."
)

CAMPAIGN_SYSTEM_PROMPT = (
    "You are a library marketing expert. "
    "Create engaging, accessible promotion content for libraries. "
    "Be creative but professional. "
    "Match the requested style exactly — format, length, and tone should fit the medium. "
    "Use light markdown formatting: ## for section headers, **bold** for emphasis, "
    "- for bullet points. Do NOT use horizontal rules (---). "
    "Keep paragraphs short and scannable. No excessive headers — one title is enough."
)


async def _generate_platform_posts(topic: str, audience: str, include_image_prompt: bool) -> dict[str, PlatformContent]:
    """Generate platform-specific social media posts."""
    # Build the prompt for all platforms in one call
    platform_specs = "\n".join(
        f"## {p['name']}\n{p['instructions']}"
        for p in SOCIAL_PLATFORMS.values()
    )

    image_section = ""
    if include_image_prompt:
        image_section = (
            "\n\n## Image Prompts\n"
            "For each platform above, also provide an **Image Prompt** — a detailed "
            "description for an AI image generator that would create a compelling visual. "
            "Include subject, style, colors, mood, composition. "
            "Suggest the correct aspect ratio for each platform.\n"
            "- Twitter: 1200x675 (landscape)\n"
            "- Instagram: 1080x1080 (square)\n"
            "- Facebook: 1200x630 (landscape)\n"
            "- LinkedIn: 1200x627 (landscape)"
        )

    messages = [
        {"role": "system", "content": CAMPAIGN_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                f"Create social media posts for a library campaign about '{topic}' "
                f"targeting {audience} audience.\n\n"
                f"Write a post for EACH platform below. Follow the platform instructions exactly.\n\n"
                f"{platform_specs}{image_section}\n\n"
                f"Format your response as:\n"
                f"## Twitter / X\n[your tweet]\n\n"
                f"## Instagram\n[your caption]\n\n"
                f"## Facebook\n[your post]\n\n"
                f"## LinkedIn\n[your post]\n\n"
                f"If image prompts requested, add after each platform post:\n"
                f"**Image Prompt:** [your image prompt]\n"
            ),
        },
    ]

    raw = await provider_chain.chat(messages)

    # Parse the response into platform-specific content
    platforms = {}
    current_platform = None
    current_lines = []

    for line in raw.split("\n"):
        line_lower = line.strip().lower()
        if line_lower.startswith("## twitter") or line_lower.startswith("## x"):
            if current_platform and current_lines:
                platforms[current_platform] = "\n".join(current_lines).strip()
            current_platform = "twitter"
            current_lines = []
        elif line_lower.startswith("## instagram"):
            if current_platform and current_lines:
                platforms[current_platform] = "\n".join(current_lines).strip()
            current_platform = "instagram"
            current_lines = []
        elif line_lower.startswith("## facebook"):
            if current_platform and current_lines:
                platforms[current_platform] = "\n".join(current_lines).strip()
            current_platform = "facebook"
            current_lines = []
        elif line_lower.startswith("## linkedin"):
            if current_platform and current_lines:
                platforms[current_platform] = "\n".join(current_lines).strip()
            current_platform = "linkedin"
            current_lines = []
        else:
            current_lines.append(line)

    if current_platform and current_lines:
        platforms[current_platform] = "\n".join(current_lines).strip()

    # Build PlatformContent objects, extracting image prompts if present
    result = {}
    for key in SOCIAL_PLATFORMS:
        text = platforms.get(key, "")
        img_prompt = None
        if include_image_prompt and text:
            # Split on "Image Prompt:" marker
            if "**image prompt:**" in text.lower():
                parts = text.split("**Image Prompt:**", 1)
                if len(parts) == 1:
                    parts = text.split("**image prompt:**", 1)
                text = parts[0].strip()
                img_prompt = parts[1].strip() if len(parts) > 1 else None
        if text:
            result[key] = PlatformContent(text=text, image_prompt=img_prompt)

    return result


@router.post("", response_model=CampaignResponse)
async def create_campaign(
    req: CampaignRequest,
    user_id: str = Depends(get_current_user),
):
    platforms = None

    # Social media gets platform-specific treatment
    if req.style == "social_media":
        platforms = await _generate_platform_posts(req.topic, req.audience, req.include_image_prompt)
        # Also generate a general blog-style summary as the main content
        style_instruction = (
            "Write a short social media strategy summary (2-3 sentences) "
            "explaining the campaign angle and why it works for this audience."
        )
    else:
        style_instruction = STYLE_GUIDE.get(req.style, f"Use a {req.style} style.")

    messages = [
        {"role": "system", "content": CAMPAIGN_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                f"Create a library promotion campaign about '{req.topic}' "
                f"for {req.audience} audience.\n\n"
                f"Style: {req.style}\n"
                f"Instructions: {style_instruction}"
            ),
        },
    ]
    content = await provider_chain.chat(messages)

    # For blog_post, optionally append image prompt
    if req.style == "blog_post" and req.include_image_prompt:
        img_messages = [
            {"role": "system", "content": "You are a visual content strategist."},
            {
                "role": "user",
                "content": (
                    f"Write a detailed AI image generation prompt for a blog post header image "
                    f"about '{req.topic}' for {req.audience} audience at a library. "
                    f"Include subject, style, colors, mood, composition, text overlay suggestions. "
                    f"Suggest 1200x630 landscape. Keep under 150 words."
                ),
            },
        ]
        img_prompt = await provider_chain.chat(img_messages)
        content += f"\n\n---\n\n**Header Image Prompt:**\n{img_prompt}"

    db = await get_db()
    try:
        cursor = await db.execute(
            "INSERT INTO campaigns (user_id, topic, audience, style, content) VALUES (?, ?, ?, ?, ?)",
            (user_id, req.topic, req.audience, req.style, content),
        )
        await db.commit()
        campaign_id = cursor.lastrowid
    finally:
        await db.close()

    return CampaignResponse(content=content, campaign_id=campaign_id, platforms=platforms)

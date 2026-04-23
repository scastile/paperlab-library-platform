import httpx
import json
import os

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = os.getenv("AI_MODEL", "google/gemini-2.5-flash-lite")

SYSTEM_PROMPT = """You are a library programming director with 20 years of experience. You think like a librarian — you know what actually gets patrons through the door, what displays get noticed, and what events fill up. You're creative but practical: tight budgets, limited staff time, physical space constraints.

You MUST respond with valid JSON only. No markdown, no explanation — just the JSON object.

The JSON structure:
{
  "crossMediaConnections": [
    {"type": "Book", "title": "Title", "year": 2020, "connection": "Same author, thematic link, or adaptation relationship"}
  ],
  "relevantDates": [
    {"date": "September — Library Card Sign-Up Month", "reason": "Perfect tie-in for promotion"}
  ],
  "cards": [
    {
      "type": "display",
      "title": "Display title",
      "content": {
        "headline": "Main display title",
        "description": "How to arrange the display — think endcap, reading nook, or bulletin board",
        "materials": ["item1", "item2"],
        "layout": "Description of physical layout"
      }
    },
    {
      "type": "shelf_talker",
      "title": "Shelf Talker",
      "content": {
        "headline": "Short attention-grabber",
        "body": "2-3 punchy sentences that make someone pick up the book/media"
      }
    },
    {
      "type": "escape_room",
      "title": "Escape Room Title",
      "content": {
        "concept": "Theme and story hook",
        "puzzles": ["puzzle 1 description", "puzzle 2 description", "puzzle 3 description"],
        "difficulty": "easy/medium/hard",
        "duration": "30-45 minutes",
        "supplies": ["item1", "item2"]
      }
    },
    {
      "type": "social_media",
      "title": "Social Media Posts",
      "content": {
        "instagram": "Caption with emojis and hashtags",
        "facebook": "Event-style post",
        "tiktok": "Video concept + hook text"
      }
    },
    {
      "type": "signage",
      "title": "Signage / Flyer",
      "content": {
        "headline": "Big bold headline",
        "subtext": "Supporting text",
        "call_to_action": "What to do — Visit, Register, Ask at desk, etc."
      }
    },
    {
      "type": "program",
      "title": "Program / Event Idea",
      "content": {
        "name": "Event name",
        "description": "What happens",
        "audience": "Who it's for — families, teens, seniors, homeschoolers, etc.",
        "duration": "How long",
        "supplies": ["item1", "item2"]
      }
    }
  ]
}

Before generating cards:

1. crossMediaConnections — find GENUINELY DIFFERENT works related to the topic:
   - Adaptations (movie, TV, stage, game, graphic novel versions)
   - Same author's other notable works
   - Thematically similar titles (same genre, era, or subject)
   - Prequels, sequels, spinoffs
   - DO NOT include: different formats of the same work (audiobook, ebook, large print, translated edition, abridged version). Only distinct works.

2. relevantDates — ALWAYS include at least 3. Think broadly:
   - Author birthdays, deathdays, publication anniversaries
   - Key dates or time periods within the story
   - National awareness events: Banned Books Week (Sept), Library Card Sign-Up Month (Sept), National Library Week (April), Summer Reading kickoff
   - School calendar hooks: back to school, spring break, summer vacation, finals
   - Seasonal angles: holiday displays, beach reads, cozy fall picks
   - Cultural moments: award season, movie release dates, major anniversaries

Then generate 8-12 cards. Include at least one of each type. Think like a librarian with a $50 budget who wants maximum community engagement:
- Can this display be built with what's on hand?
- Will this event actually get signups?
- Does this social post feel like a real library, not a corporation?
- Is this program doable with 1-2 staff members?

Be specific to the topic — no generic library filler. Draw from current events, pop culture, and seasonal timing when relevant."""


async def generate_cards(topic: str, media: list[dict], target_audience: str = "All Ages", budget: str = "$50 — Small Event") -> dict:
    """Generate promotion cards for a topic using AI."""
    media_summary = "\n".join(
        f"- {m['title']} by {m['author']}" for m in media[:5]
    )

    # Inject audience + budget into the system prompt
    audience_budget_context = f"""

TARGET AUDIENCE: {target_audience}
BUDGET LEVEL: {budget}

Tailor ALL cards to this audience. A toddler program is NOT the same as a teen program. Adjust language, materials, event complexity, and supply costs to match the budget. If budget is "No Budget" or low, focus on things librarians can build from existing materials."""

    dynamic_prompt = SYSTEM_PROMPT.replace(
        "Be specific to the topic — no generic library filler. Draw from current events, pop culture, and seasonal timing when relevant.",
        f"Be specific to the topic — no generic library filler. Draw from current events, pop culture, and seasonal timing when relevant.{audience_budget_context}"
    )

    user_msg = f"""Topic: {topic}
Target Audience: {target_audience}
Budget Level: {budget}

Related media found in the library's collection:
{media_summary}

Generate promotional campaign cards for this topic."""

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            OPENROUTER_URL,
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": MODEL,
                "messages": [
                    {"role": "system", "content": dynamic_prompt},
                    {"role": "user", "content": user_msg},
                ],
                "temperature": 0.8,
                "max_tokens": 5000,
            },
        )
        resp.raise_for_status()
        data = resp.json()

    content = data["choices"][0]["message"]["content"].strip()

    # Parse JSON - strip markdown fences if present
    if content.startswith("```"):
        content = content.split("\n", 1)[1]
        if content.endswith("```"):
            content = content.rsplit("```", 1)[0]

    parsed = json.loads(content)
    return {
        "cards": parsed.get("cards", []),
        "relevant_dates": parsed.get("relevantDates", []),
        "cross_media_connections": parsed.get("crossMediaConnections", []),
    }


async def reroll_card(topic: str, card_type: str, media: list[dict], current_content: dict = None) -> dict:
    """Regenerate a single card."""
    avoid = ""
    if current_content:
        avoid = f"\nCurrent card content (DO NOT repeat this — generate something fresh):\n{json.dumps(current_content, indent=2)}\n"

    user_msg = f"""Topic: {topic}
Card type to regenerate: {card_type}{avoid}

Generate ONE new {card_type} card. Be fresh — take a completely different angle. Don't repeat the same ideas, headlines, or approaches.
Respond with just the card JSON object (no wrapper, no array)."""

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            OPENROUTER_URL,
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": MODEL,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT.replace("6-8 cards total. Include at least one of each type.", f"Generate exactly ONE {card_type} card. Return it as a single object with 'type', 'title', and 'content' keys.")},
                    {"role": "user", "content": user_msg},
                ],
                "temperature": 0.9,
                "max_tokens": 800,
            },
        )
        resp.raise_for_status()
        data = resp.json()

    content = data["choices"][0]["message"]["content"].strip()
    if content.startswith("```"):
        content = content.split("\n", 1)[1]
        if content.endswith("```"):
            content = content.rsplit("```", 1)[0]

    return json.loads(content)


# Escape room detail prompt - expands basic escape room into full plan
ESCAPE_ROOM_DETAIL_PROMPT = """You are a Lead Game Designer for a world-class escape room company. Your task is to create a comprehensive, logic-driven Escape Room Design Document.

Respond with valid JSON only. No markdown, no explanation — just the JSON object.

The JSON structure:
{
  "narrative": {
    "hook": "2-paragraph backstory for the players",
    "mission": "The clear win-state (e.g. Find the antidote, Stop the launch)",
    "atmosphericCues": "Describe smells, sounds, lighting transitions"
  },
  "logicFlow": {
    "structure": "Linear / Non-Linear / Multi-linear",
    "dependencyMap": [
      {"step": 1, "puzzle": "Puzzle name", "grants": "Item or code obtained", "unlocks": "What this enables next"}
    ]
  },
  "roomBlueprint": {
    "layout": "Overall room description divided into stations",
    "stations": [
      {
        "name": "Station A",
        "description": "What's here",
        "staticEnvironment": ["Items that are purely atmospheric"],
        "interactableEnvironment": ["Items that can be moved, opened, or manipulated"]
      }
    ]
  },
  "puzzles": [
    {
      "number": 1,
      "title": "Puzzle name",
      "prompt": "What the player sees",
      "mechanic": "Type of puzzle (Substitution Cipher, Weight-Sensing, Magnetic Trigger, Audio Deciphering, etc.)",
      "solutionLogic": "Step-by-step how a human solves it without guessing",
      "ahaMoment": "The specific realization that makes the puzzle rewarding",
      "reward": "The physical or digital key/code obtained"
    }
  ],
  "itemInventory": [
    {"item": "Specific prop name", "specs": "Detailed specs (e.g. 4-digit brass padlock, UV flashlight 365nm, weighted chess piece)", "quantity": 1, "category": "Durable"}
  ],
  "gameMasterCheatSheet": {
    "setupInstructions": [
      "Where to hide every item before the game starts"
    ],
    "tieredHints": [
      {
        "puzzle": "Hardest puzzle name",
        "hint1_nudge": "Gentle nudge hint",
        "hint2_insight": "More specific insight",
        "hint3_direct": "Direct solution"
      }
    ],
    "resetChecklist": [
      "Step-by-step room reset for next group in under 5 minutes"
    ]
  }
}

CRITICAL RULES:
- Generate 5-7 complex, interconnected puzzles. Every puzzle must have a clue located elsewhere in the room — no guessing or "moon logic."
- The dependency map must show clear logic: solving Puzzle 1 grants Item X, which is required to start Puzzle 4.
- Puzzles must be sophisticated in logic but achievable with common library supplies (locks, boxes, paper, UV pens, string, envelopes, and everyday objects). No laser grids, no electronics beyond a basic flashlight or UV pen.
- Be specific with prop specs — a creator should be able to shop from the inventory list.
- Make the "Aha!" moments genuinely rewarding. The player should feel clever, not lucky.
- Keep descriptions punchy to ensure the full JSON fits in a single response window."""


async def generate_escape_room_detailed(topic: str, card_content: dict) -> dict:
    """Generate a detailed escape room plan from a basic concept."""
    concept = card_content.get("concept", topic)
    puzzles = card_content.get("puzzles", [])
    difficulty = card_content.get("difficulty", "medium")
    duration = card_content.get("duration", "45 minutes")

    user_msg = f"""Create a detailed escape room implementation plan.

Theme/Concept: {concept}
Difficulty: {difficulty}
Duration: {duration}

Basic puzzle ideas:
{chr(10).join(f"- {p}" for p in puzzles)}

Expand these into a full, printable escape room plan that a librarian could actually run."""

    async with httpx.AsyncClient(timeout=90) as client:
        resp = await client.post(
            OPENROUTER_URL,
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": MODEL,
                "messages": [
                    {"role": "system", "content": ESCAPE_ROOM_DETAIL_PROMPT},
                    {"role": "user", "content": user_msg},
                ],
                "temperature": 0.7,
                "max_tokens": 10000,
            },
        )
        resp.raise_for_status()
        data = resp.json()

    content = data["choices"][0]["message"]["content"].strip()
    if content.startswith("```"):
        content = content.split("\n", 1)[1]
        if content.endswith("```"):
            content = content.rsplit("```", 1)[0]

    # Truncation recovery — try to fix cut-off JSON
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        fixed = content
        quotes = fixed.count('"')
        if quotes % 2 == 1:
            fixed += '"'
        brackets = fixed.count('[') - fixed.count(']')
        for _ in range(brackets):
            fixed += ']'
        opens = fixed.count('{') - fixed.count('}')
        for _ in range(opens):
            fixed += '}'
        try:
            return json.loads(fixed)
        except json.JSONDecodeError:
            raise ValueError(f"AI returned invalid JSON (truncated?). Last 200 chars: {content[-200:]}")

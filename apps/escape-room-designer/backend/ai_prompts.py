import httpx
import json
import os

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = os.getenv("AI_MODEL", "google/gemini-2.5-flash-lite")

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


async def generate_escape_room_detailed(theme: str, age_group: str, difficulty: str, duration: str, inventory: list[str] = None) -> dict:
    """Generate a detailed escape room plan."""
    inventory_text = ""
    if inventory:
        inventory_text = "\nThe library already has these items: " + ", ".join(inventory) + ". Prioritize building puzzles around these specific items. Do NOT suggest items they don't own unless absolutely necessary."

    user_msg = f"""Create a detailed escape room implementation plan.

Theme: {theme}
Target Age Group: {age_group}
Difficulty: {difficulty}
Duration: {duration}{inventory_text}

Expand this into a full, printable escape room plan that a librarian could actually run."""

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

    # Truncation recovery
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

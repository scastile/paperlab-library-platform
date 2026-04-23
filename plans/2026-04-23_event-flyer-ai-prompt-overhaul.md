# Event Flyer Studio — AI Prompt Overhaul Plan

## Goal
Eliminate the #1 quality failure mode (busy backgrounds with unreadable text) and make generated flyers look professionally designed instead of AI-slop. Implement the four techniques from the research doc, plus Nano Banana (Gemini) specific optimizations from our `ai-image-prompting` skill.

## Current State
- `ai_prompts.py` already has `LAYOUT_COMPOSITION`, `VIBE_DESCRIPTORS`, fallback builder, narrative paragraph prompts
- `flyer_renderer.py` already has `LAYOUT_CONFIGS` with per-vibe text positioning
- `main.py` image wrapper still says `"Generate a flyer background image: {prompt}"` — this is the poison pill
- Model is now `google/gemini-3.1-flash-image-preview`

## The Four Fixes + Nano Banana Enhancements

---

### 1. Kill the "Flyer" Context in the Wrapper (main.py)

**Problem:** The word "flyer" in the wrapper triggers the image model to "help" by adding garbled AI text, fake UI elements, or text boxes because its training data for "flyer" includes those elements.

**Fix in `main.py` `generate_background_image()`:**

```python
# BEFORE (poison):
"messages": [{"role": "user", "content": f"Generate a flyer background image: {prompt}"}]

# AFTER (clean):
NEGATIVE_SUFFIX = (
    "The image must be a background only. "
    "Do not include any placeholder text, labels, UI elements, or borders. "
    "No text, no letters, no words, no characters, no watermarks. "
    "Ensure the text-safe zone is clear of complex details."
)

wrapper = (
    f"A high-quality professional photograph or illustration for a background: {prompt}. "
    f"Minimalist, clean composition. {NEGATIVE_SUFFIX}"
)
"messages": [{"role": "user", "content": wrapper}]
```

**Why this works:** Nano Banana (Gemini) follows conversational context well. Telling it "this is a background" instead of "this is a flyer" removes the implicit instruction to add text.

---

### 2. Geometric Anchors / Rule of Thirds (ai_prompts.py)

**Problem:** Current instructions like "bottom third is calm" are too abstract. Nano Banana responds better to hard geometric positioning than vague safe zones.

**Fix:** Replace `LAYOUT_COMPOSITION` instructions with specific compositional rules that anchor subjects to edges and mandate negative space percentages.

```python
LAYOUT_COMPOSITION = {
    "poster": {
        "zone": "lower center and bottom third",
        "subject_position": "upper half or off-center top",
        "lighting_note": "soft gradient or atmospheric haze in the lower area",
        # NEW — geometric anchor
        "geometric_rule": (
            "Compositional focus on the bottom edge. "
            "The top 60% of the image must be clean, solid, or softly blurred negative space. "
            "The main subject is anchored to the upper third only."
        ),
    },
    "modern": {
        "zone": "left side and upper-left quadrant",
        "subject_position": "right side, lower right, fading right",
        "lighting_note": "clean, even lighting with subtle shadow depth on the right",
        # NEW — geometric anchor
        "geometric_rule": (
            "Subject centered at the bottom. "
            "Use a vertical gradient fade toward the top for text readability. "
            "The left 50% of the frame must remain empty, flat-color, or out-of-focus."
        ),
    },
    "social": {
        "zone": "center",
        "subject_position": "edges, corners, framing perimeter",
        "lighting_note": "even, soft lighting with subtle vignette",
        # NEW — geometric anchor
        "geometric_rule": (
            "Subject placed in the far-right third of the frame. "
            "The left two-thirds must remain an empty, flat-color or out-of-focus background. "
            "Center area must be low-detail and muted."
        ),
    },
}
```

**Update `_build_image_prompt()` to inject `geometric_rule`:**
```python
prompt = (
    f"A {desc['style']} depicting a {theme or 'community event'} scene. "
    f"The mood is {desc['mood']}, rendered in {desc['colors']}. "
    f"{desc['detail']}. "
    f"{comp['geometric_rule']} "  # <-- NEW
    f"Lighting should be {comp['lighting_note']}. "
    f"No text, no letters, no words, no watermarks in the image."
)
```

---

### 3. Style-Override Layer (main.py)

**Problem:** If the vibe gets lost, it's because the LLM's image_prompt gets too wordy, causing the image model to lose the aesthetic in the noise.

**Fix:** Add a `VIBE_OVERRIDE` dict in `main.py` that "sandbags" the vibe at the FRONT of the final wrapper. Nano Banana weighs the beginning of prompts heavily.

```python
VIBE_OVERRIDES = {
    "Modern & Sleek": (
        "Shot on 35mm film, minimalist, sharp focus, neutral palette, "
        "high-end editorial style, clean lines, architectural."
    ),
    "Whimsical": (
        "Magical realism, vibrant colors, soft diffused lighting, "
        "storybook illustration style, gentle watercolor textures."
    ),
    "Vintage Scholastic": (
        "Retro 1970s print aesthetic, halftone dots, aged paper texture, "
        "muted earth tones, warm analog film grain."
    ),
    "High-Energy": (
        "Dynamic action photography, motion blur, dramatic angles, "
        "bold graphic elements, explosive composition, vivid saturated colors."
    ),
    "Calm & Relaxing": (
        "Serene landscape photography, shallow depth of field, "
        "soft natural light, pastel tones, tranquil composition."
    ),
    "Festive": (
        "Rich celebratory photography, warm ambient lighting, "
        "bokeh lights, deep jewel tones, joyful composition."
    ),
}

# In generate_background_image():
vibe = fields.get("vibe", "Modern & Sleek")
vibe_prefix = VIBE_OVERRIDES.get(vibe, "")

final_wrapper = (
    f"{vibe_prefix} "
    f"A high-quality professional background image: {prompt}. "
    f"Minimalist, clean composition. {NEGATIVE_SUFFIX}"
)
```

**Key:** The vibe override goes FIRST because Nano Banana gives highest weight to opening phrases.

---

### 4. Frontend Blur Cheat + Dynamic Backdrop (frontend)

**Problem:** Even with perfect prompts, some generations are slightly too busy for white text.

**Fix:** Add a CSS `backdrop-filter: blur()` layer in the flyer preview that makes even "bad" busy images look intentional and professional. This is a SAFETY NET, not a crutch.

**In the frontend preview component (React):**
```jsx
// When displaying the generated flyer preview
<div className="flyer-preview-container">
  <img src={`data:image/png;base64,${pngBase64}`} alt="Flyer preview" />
  {/* Optional safety blur overlay — toggleable */}
  <div 
    className="backdrop-blur-overlay"
    style={{
      position: 'absolute',
      inset: 0,
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      maskImage: 'linear-gradient(to bottom, transparent 30%, black 70%)',
      WebkitMaskImage: 'linear-gradient(to bottom, transparent 30%, black 70%)',
      pointerEvents: 'none',
      opacity: showBlur ? 0.4 : 0,
    }}
  />
</div>
```

The gradient mask means the blur only affects the bottom text zone, preserving image detail in the subject area.

---

### 5. Nano Banana Specific Prompt Architecture

From our `ai-image-prompting` skill:
- Nano Banana (Gemini) follows **conversational prompts** well
- It gives highest weight to **opening phrases**
- It excels at **creative interpretation** from minimal descriptions
- It is **NOT** a keyword-driven model like Midjourney

**Architecture: The "Prompt Sandwich"**
```
[STYLE OVERRIDE — front-loaded aesthetic anchor]
    ↓
[SUBJECT + SCENE — narrative paragraph, not keywords]
    ↓
[GEOMETRIC CONSTRAINT — hard rule about negative space]
    ↓
[NEGATIVE CONSTRAINTS — what to exclude]
```

**Example final prompt for Nano Banana:**
```
Shot on 35mm film, minimalist, sharp focus, neutral palette, high-end editorial style.

A professional background photograph of a modern library reading room with floor-to-ceiling windows at sunset. Clean geometric bookshelves line the far wall. The mood is confident and contemporary, rendered in deep navy, charcoal, silver, and electric accent tones. Subtle grain texture and architectural lines frame the scene.

Compositional focus on the bottom edge. The top 60% of the image must be clean, solid, or softly blurred negative space. The main subject is anchored to the upper third only. Lighting should be soft gradient or atmospheric haze in the lower area, brighter or more detailed above.

No text, no letters, no words, no characters, no watermarks, no UI elements, no borders. The image must be a background only. Ensure the text-safe zone is clear of complex details.
```

This is ~180 words — well within Nano Banana's sweet spot. It opens with style, describes the scene narratively, adds the geometric rule, then excludes.

---

## Files to Change

| File | Changes |
|------|---------|
| `apps/event-flyer-studio/backend/main.py` | Add `VIBE_OVERRIDES`, `NEGATIVE_SUFFIX`, rewrite `generate_background_image()` wrapper, update model call |
| `apps/event-flyer-studio/backend/ai_prompts.py` | Add `geometric_rule` to `LAYOUT_COMPOSITION`, update `_build_image_prompt()` to use it, strengthen SYSTEM_PROMPT |
| `apps/event-flyer-studio/frontend/src/App.jsx` (or preview component) | Add optional blur overlay toggle |
| `apps/event-flyer-studio/backend/flyer_renderer.py` | No changes needed — already layout+vibe aware |

## Implementation Order

1. **Patch `ai_prompts.py`** — add geometric rules, update fallback builder
2. **Patch `main.py`** — add vibe overrides, rewrite wrapper, add negative suffix
3. **Test one generation** per layout to verify text readability
4. **Add frontend blur toggle** if any layouts still feel busy
5. **Deploy** with `docker compose build flyer-backend && docker compose up -d --force-recreate flyer-backend`

## Validation Checklist

- [ ] Poster layout: text clearly readable over bottom-third gradient
- [ ] Modern layout: left-side text pops against right-side subject
- [ ] Social layout: centered text readable against edge-framed subject
- [ ] No garbled AI text or fake UI elements in any generated background
- [ ] Vibe aesthetics are distinct and match the emotional tone
- [ ] Regenerate (text-only re-render) still works correctly

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Nano Banana 3.1 handles prompt differently than 2.5 | Test all 3 layouts immediately after deploy |
| Style override makes all vibes look samey | Keep overrides distinct and test side-by-side |
| Geometric rules too rigid, images look artificial | Fallback to existing `instruction` if user reports stiffness |
| Frontend blur becomes a crutch for bad prompts | Make it opt-in toggle, not default on |

## Open Questions

1. Should we add a "prompt preview" UI so users can see the exact prompt sent to the image model? (Good for debugging, bad for complexity)
2. Should we cache generated backgrounds per (theme, vibe, layout) combo to save credits on similar events?
3. Should we A/B test the old vs new wrapper and measure text-readability scores?

---
*Plan generated 2026-04-23. Nano Banana (Gemini) optimizations sourced from `ai-image-prompting` skill.*

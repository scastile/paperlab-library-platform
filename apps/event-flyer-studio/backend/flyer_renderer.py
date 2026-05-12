"""Event Flyer Studio — PIL-based PNG/PDF renderer.

Why this still exists:
  1. /api/generate  — returns `png_base64` for the legacy download-
     only flow and as a fallback if the HTML client can't render.
  2. /api/flyers/{id}/download/png  — PNG download endpoint serves
     the Pillow-rendered image directly from the DB blob.
  3. /api/flyers/{id}/download/pdf  — PDF endpoint converts the
     stored PNG via img2pdf.

The live preview in the browser now uses an HTML/CSS renderer
(FlyerPreview.jsx + html-to-image).  All new edits that affect the
visual look of a flyer should update BOTH:
  · backend/flyer_renderer.py  (Pillow — download outputs)
  · frontend/src/components/FlyerPreview.jsx  (HTML — live preview)

If/when the project drops the Pillow renderer entirely, these three
endpoints must be rewritten to use headless Chromium (puppeteer or
playwright) to capture the HTML instead.
"""
import io
import base64
from datetime import datetime
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import qrcode
import colorsys

# Layout dimensions
SIZES = {
    "poster": (1275, 1650),
    "modern": (1275, 1650),
    "social": (1080, 1080),
    "split": (1275, 1650),
    "classic": (1275, 1650),
    "minimal": (1275, 1650),
}

VIBE_COLORS = {
    "Whimsical": ("#FF6B9D", "#FFF0F5"),
    "Modern & Sleek": ("#1a1a2e", "#f5f5f7"),
    "Vintage Scholastic": ("#8B4513", "#F5F5DC"),
    "High-Energy": ("#FF4500", "#FFF8DC"),
    "Calm & Relaxing": ("#4682B4", "#F0F8FF"),
    "Festive": ("#DAA520", "#FFF8DC"),
}

# ---------------------------------------------------------------------------
# Date / Time formatting helpers
# ---------------------------------------------------------------------------

def format_date_long(date_str: str) -> str:
    if not date_str:
        return ""
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(date_str, fmt).strftime("%B %d, %Y")
        except ValueError:
            continue
    return date_str


def format_time_12h(time_str: str) -> str:
    if not time_str:
        return ""
    for fmt in ("%H:%M", "%H:%M:%S"):
        try:
            dt = datetime.strptime(time_str, fmt)
            return dt.strftime("%I:%M %p").lstrip("0")
        except ValueError:
            continue
    return time_str


# ---------------------------------------------------------------------------
# Layout configs
# ---------------------------------------------------------------------------
LAYOUT_CONFIGS = {
    "poster": {
        "Whimsical":          {"anchor_y": 0.18, "align": "center", "margin_scale": 1.0, "headline_scale": 1.0},
        "Modern & Sleek":     {"anchor_y": 0.52, "align": "center", "margin_scale": 1.0, "headline_scale": 1.0},
        "Vintage Scholastic": {"anchor_y": 0.55, "align": "center", "margin_scale": 1.1, "headline_scale": 0.95},
        "High-Energy":        {"anchor_y": 0.12, "align": "center", "margin_scale": 0.9, "headline_scale": 1.15},
        "Calm & Relaxing":    {"anchor_y": 0.40, "align": "center", "margin_scale": 1.2, "headline_scale": 0.95},
        "Festive":            {"anchor_y": 0.52, "align": "center", "margin_scale": 1.0, "headline_scale": 1.05},
    },
    "modern": {
        "Whimsical":          {"anchor_y": 0.25, "align": "right",  "margin_scale": 1.0, "headline_scale": 1.0},
        "Modern & Sleek":     {"anchor_y": 0.14, "align": "left",   "margin_scale": 1.0, "headline_scale": 1.0},
        "Vintage Scholastic": {"anchor_y": 0.30, "align": "left",   "margin_scale": 1.1, "headline_scale": 0.95},
        "High-Energy":        {"anchor_y": 0.10, "align": "left",   "margin_scale": 0.9, "headline_scale": 1.15},
        "Calm & Relaxing":    {"anchor_y": 0.30, "align": "left",   "margin_scale": 1.2, "headline_scale": 0.95},
        "Festive":            {"anchor_y": 0.45, "align": "left",   "margin_scale": 1.0, "headline_scale": 1.05},
    },
    "social": {
        "Whimsical":          {"anchor_y": 0.16, "align": "center", "margin_scale": 1.0, "headline_scale": 1.0},
        "Modern & Sleek":     {"anchor_y": 0.22, "align": "center", "margin_scale": 1.0, "headline_scale": 1.0},
        "Vintage Scholastic": {"anchor_y": 0.30, "align": "center", "margin_scale": 1.1, "headline_scale": 0.95},
        "High-Energy":        {"anchor_y": 0.10, "align": "center", "margin_scale": 0.9, "headline_scale": 1.15},
        "Calm & Relaxing":    {"anchor_y": 0.35, "align": "center", "margin_scale": 1.2, "headline_scale": 0.95},
        "Festive":            {"anchor_y": 0.28, "align": "center", "margin_scale": 1.0, "headline_scale": 1.05},
    },
    "split": {
        "Whimsical":          {"anchor_y": 0.20, "align": "center", "margin_scale": 1.0, "headline_scale": 1.0},
        "Modern & Sleek":     {"anchor_y": 0.20, "align": "center", "margin_scale": 1.0, "headline_scale": 1.0},
        "Vintage Scholastic": {"anchor_y": 0.22, "align": "center", "margin_scale": 1.1, "headline_scale": 0.95},
        "High-Energy":        {"anchor_y": 0.15, "align": "center", "margin_scale": 0.9, "headline_scale": 1.15},
        "Calm & Relaxing":    {"anchor_y": 0.25, "align": "center", "margin_scale": 1.2, "headline_scale": 0.95},
        "Festive":            {"anchor_y": 0.22, "align": "center", "margin_scale": 1.0, "headline_scale": 1.05},
    },
    "classic": {
        "Whimsical":          {"anchor_y": 0.20, "align": "center", "margin_scale": 1.0, "headline_scale": 1.0},
        "Modern & Sleek":     {"anchor_y": 0.22, "align": "center", "margin_scale": 1.0, "headline_scale": 1.0},
        "Vintage Scholastic": {"anchor_y": 0.24, "align": "center", "margin_scale": 1.1, "headline_scale": 0.95},
        "High-Energy":        {"anchor_y": 0.15, "align": "center", "margin_scale": 0.9, "headline_scale": 1.15},
        "Calm & Relaxing":    {"anchor_y": 0.25, "align": "center", "margin_scale": 1.2, "headline_scale": 0.95},
        "Festive":            {"anchor_y": 0.22, "align": "center", "margin_scale": 1.0, "headline_scale": 1.05},
    },
    "minimal": {
        "Whimsical":          {"anchor_y": 0.22, "align": "center", "margin_scale": 1.0, "headline_scale": 1.0},
        "Modern & Sleek":     {"anchor_y": 0.25, "align": "center", "margin_scale": 1.0, "headline_scale": 1.0},
        "Vintage Scholastic": {"anchor_y": 0.27, "align": "center", "margin_scale": 1.1, "headline_scale": 0.95},
        "High-Energy":        {"anchor_y": 0.18, "align": "center", "margin_scale": 0.9, "headline_scale": 1.15},
        "Calm & Relaxing":    {"anchor_y": 0.28, "align": "center", "margin_scale": 1.2, "headline_scale": 0.95},
        "Festive":            {"anchor_y": 0.25, "align": "center", "margin_scale": 1.0, "headline_scale": 1.05},
    },
}


def _get_config(vibe: str, layout: str) -> dict:
    defaults = {"anchor_y": 0.5, "align": "center", "margin_scale": 1.0, "headline_scale": 1.0}
    return LAYOUT_CONFIGS.get(layout, {}).get(vibe, defaults)


def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))


def get_font(size, bold=False):
    try:
        name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
        return ImageFont.truetype(f"/usr/share/fonts/truetype/dejavu/{name}", size)
    except Exception:
        try:
            return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", size)
        except Exception:
            return ImageFont.load_default()


def create_gradient(size, color1, color2, direction="vertical"):
    base = Image.new('RGB', size, color1)
    draw = ImageDraw.Draw(base)
    w, h = size
    if direction == "vertical":
        for y in range(h):
            ratio = y / h
            r = int(color1[0] * (1 - ratio) + color2[0] * ratio)
            g = int(color1[1] * (1 - ratio) + color2[1] * ratio)
            b = int(color1[2] * (1 - ratio) + color2[2] * ratio)
            draw.line([(0, y), (w, y)], fill=(r, g, b))
    else:
        for x in range(w):
            ratio = x / w
            r = int(color1[0] * (1 - ratio) + color2[0] * ratio)
            g = int(color1[1] * (1 - ratio) + color2[1] * ratio)
            b = int(color1[2] * (1 - ratio) + color2[2] * ratio)
            draw.line([(x, 0), (x, h)], fill=(r, g, b))
    return base


def draw_text_panel(draw, img, x, y, w, h, radius=20, fill=(0, 0, 0, 180)):
    panel = Image.new('RGBA', img.size, (0, 0, 0, 0))
    pdraw = ImageDraw.Draw(panel)
    pdraw.rounded_rectangle([x, y, x + w, y + h], radius=radius, fill=fill)
    img.paste(panel, (0, 0), panel)
    return y + h + 20


def wrap_text(draw, text, font, max_width):
    words = text.split()
    lines = []
    current = ""
    for word in words:
        test = current + " " + word if current else word
        bbox = draw.textbbox((0, 0), test, font=font)
        if bbox[2] - bbox[0] <= max_width:
            current = test
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def _text_anchor_x(align: str, w: int, text_w: int, margin: int) -> int:
    if align == "right":
        return w - margin - text_w
    if align == "left":
        return margin
    return (w - text_w) // 2


def _draw_logo(draw, img, logo_path, position, max_size=(200, 100)):
    """Render a logo at the given position."""
    if not logo_path:
        return
    try:
        logo = Image.open(logo_path).convert("RGBA")
        logo.thumbnail(max_size, Image.LANCZOS)
        lx, ly = position
        img.paste(logo, (lx, ly), logo)
    except Exception:
        pass


def _draw_qr(img, website, position, size=140):
    if not website:
        return
    try:
        qr = qrcode.make(website, box_size=4, border=2).convert('RGBA')
        qr = qr.resize((size, size))
        img.paste(qr, position, qr)
    except Exception:
        pass


def _panel_colors(bg_brightness, image_path):
    """Return (panel_fill, text_fill, body_fill, info_fill) based on background."""
    if bg_brightness > 180 or image_path:
        return (
            (20, 20, 30, 210),
            (255, 255, 255),
            (240, 240, 240),
            (220, 220, 220),
        )
    else:
        return (
            (255, 255, 255, 230),
            (30, 30, 30),
            (50, 50, 50),
            (70, 70, 70),
        )


def render_flyer(fields: dict, layout: str = "poster") -> bytes:
    size = SIZES.get(layout, SIZES["poster"])
    w, h = size

    vibe = fields.get("vibe", "Modern & Sleek")
    cfg = _get_config(vibe, layout)

    accent_hex = fields.get("accent_color", VIBE_COLORS.get(vibe, ("#6366f1", "#f5f5f7"))[0])
    bg_hex = fields.get("bg_color", VIBE_COLORS.get(vibe, ("#6366f1", "#f5f5f7"))[1])
    accent = hex_to_rgb(accent_hex)
    bg = hex_to_rgb(bg_hex)

    image_path = fields.get("image_path")
    logo_path = fields.get("logo_path")

    # Create base image
    if image_path:
        try:
            bg_img = Image.open(image_path).convert("RGB")
            bg_img = bg_img.resize(size, Image.LANCZOS)
        except Exception:
            bg_img = create_gradient(size, bg, (255, 255, 255))
    else:
        c1 = bg
        c2 = tuple(min(255, int(c * 1.1)) for c in bg)
        bg_img = create_gradient(size, c1, c2)

    img = bg_img.convert("RGBA")
    draw = ImageDraw.Draw(img)

    margin = int(80 * cfg["margin_scale"])
    anchor_y = int(h * cfg["anchor_y"])
    align = cfg["align"]
    content_w = w - margin * 2

    bg_brightness = (bg[0] * 299 + bg[1] * 587 + bg[2] * 114) / 1000
    panel_fill, text_fill, body_fill, info_fill = _panel_colors(bg_brightness, image_path)

    headline = fields.get("headline", "Event")
    body = fields.get("body_text", "")
    cta = fields.get("cta_text", "")
    website = fields.get("website", "")

    date_raw = fields.get("date", "")
    time_raw = fields.get("time", "")
    tz_raw = fields.get("timezone", "")
    loc_str = fields.get("location", "")
    date_str = format_date_long(date_raw)
    time_str = format_time_12h(time_raw)
    if time_str and tz_raw:
        time_str = f"{time_str} {tz_raw}"
    info_parts = [p for p in [date_str, time_str, loc_str] if p]

    # ========================================================================
    # POSTER
    # ========================================================================
    if layout == "poster":
        draw.rectangle([0, 0, w, 12], fill=accent)

        base_size = 96 if len(headline) < 20 else 72
        hl_font_size = int(base_size * cfg["headline_scale"])
        hl_font = get_font(hl_font_size, bold=True)
        hl_lines = wrap_text(draw, headline, hl_font, content_w)
        hl_height = len(hl_lines[:3]) * (hl_font_size + 10)

        body_height = 0
        body_line_h = 44
        if body:
            body_font = get_font(38)
            body_lines = wrap_text(draw, body, body_font, content_w)
            body_height = 20 + len(body_lines[:4]) * body_line_h

        info_height = 30 + 55 if info_parts else 0

        cta_height = 0
        if cta:
            cta_font = get_font(40, bold=True)
            cbbox = draw.textbbox((0, 0), cta, font=cta_font)
            cta_height = 20 + (cbbox[3] - cbbox[1]) + 44 + 30

        total_text_h = hl_height + body_height + info_height + cta_height + 40
        panel_y = anchor_y - 30
        panel_x = margin - 30
        panel_w = content_w + 60
        panel_h = total_text_h

        draw_text_panel(draw, img, panel_x, panel_y, panel_w, panel_h, radius=24, fill=panel_fill)

        y = anchor_y
        for line in hl_lines[:3]:
            bbox = draw.textbbox((0, 0), line, font=hl_font)
            tw = bbox[2] - bbox[0]
            x = _text_anchor_x(align, w, tw, margin)
            draw.text((x, y), line, font=hl_font, fill=text_fill)
            y += hl_font_size + 10

        if body:
            y += 20
            body_font = get_font(38)
            for line in wrap_text(draw, body, body_font, content_w)[:4]:
                bbox = draw.textbbox((0, 0), line, font=body_font)
                tw = bbox[2] - bbox[0]
                x = _text_anchor_x(align, w, tw, margin)
                draw.text((x, y), line, font=body_font, fill=body_fill)
                y += body_line_h

        y += 30
        if info_parts:
            info_text = "  |  ".join(info_parts)
            font = get_font(32)
            bbox = draw.textbbox((0, 0), info_text, font=font)
            tw = bbox[2] - bbox[0]
            x = _text_anchor_x(align, w, tw, margin)
            draw.text((x, y), info_text, font=font, fill=info_fill)
            y += 55

        if cta:
            font = get_font(40, bold=True)
            bbox = draw.textbbox((0, 0), cta, font=font)
            tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
            pad_x, pad_y = 55, 22
            bx = _text_anchor_x(align, w, tw + pad_x * 2, margin)
            by = y + 20
            draw.rounded_rectangle([bx, by, bx + tw + pad_x*2, by + th + pad_y*2], radius=8, fill=accent)
            draw.text((bx + pad_x, by + pad_y - 4), cta, font=font, fill=(255, 255, 255))
            y = by + th + pad_y * 2 + 30

        _draw_logo(draw, img, logo_path, (w - 220, 30), max_size=(180, 90))
        _draw_qr(img, website, (w - 180, h - 180), size=140)

    # ========================================================================
    # MODERN
    # ========================================================================
    elif layout == "modern":
        bar_w = 16
        if align == "left":
            draw.rectangle([0, 0, bar_w, h], fill=accent)
        elif align == "right":
            draw.rectangle([w - bar_w, 0, w, h], fill=accent)
        else:
            draw.rectangle([0, 0, w, 12], fill=accent)

        label = "UPCOMING EVENT"
        font = get_font(24)
        lbbox = draw.textbbox((0, 0), label, font=font)
        label_w = lbbox[2] - lbbox[0]
        label_h = lbbox[3] - lbbox[1]
        lx = _text_anchor_x(align, w, label_w, margin)

        base_size = 108 if len(headline) < 20 else 84
        hl_font_size = int(base_size * cfg["headline_scale"])
        hl_font = get_font(hl_font_size, bold=True)
        hl_lines = wrap_text(draw, headline, hl_font, content_w)
        hl_height = len(hl_lines[:3]) * (hl_font_size + 12)

        body_height = 0
        body_line_h = 46
        if body:
            body_font = get_font(36)
            body_lines = wrap_text(draw, body, body_font, content_w)
            body_height = len(body_lines[:5]) * body_line_h

        info_height = 0
        info_font = get_font(30)
        info_count = sum(1 for v in [date_str, time_str, loc_str] if v)
        if info_count:
            info_height = 40 + info_count * 46

        cta_height = 0
        if cta:
            cta_font = get_font(36, bold=True)
            cbbox = draw.textbbox((0, 0), cta, font=cta_font)
            cta_height = 30 + (cbbox[3] - cbbox[1]) + 32 + 20

        total_text_h = 50 + label_h + hl_height + 30 + body_height + info_height + cta_height + 40
        panel_y = anchor_y - 30
        panel_x = margin - 30
        panel_w = content_w + 60
        panel_h = total_text_h

        draw_text_panel(draw, img, panel_x, panel_y, panel_w, panel_h, radius=20, fill=panel_fill)

        y = anchor_y
        draw.text((lx, y), label, font=font, fill=accent)
        y += 50

        for line in hl_lines[:3]:
            lx = _text_anchor_x(align, w, draw.textbbox((0,0), line, font=hl_font)[2] - draw.textbbox((0,0), line, font=hl_font)[0], margin)
            draw.text((lx, y), line, font=hl_font, fill=text_fill)
            y += hl_font_size + 12

        y += 30
        if body:
            body_font = get_font(36)
            for line in wrap_text(draw, body, body_font, content_w)[:5]:
                lx = _text_anchor_x(align, w, draw.textbbox((0,0), line, font=body_font)[2] - draw.textbbox((0,0), line, font=body_font)[0], margin)
                draw.text((lx, y), line, font=body_font, fill=body_fill)
                y += body_line_h

        y += 40
        for label_txt, val in [("DATE", date_str), ("TIME", time_str), ("LOCATION", loc_str)]:
            if val:
                text = f"{label_txt}:  {val}"
                lx = _text_anchor_x(align, w, draw.textbbox((0,0), text, font=info_font)[2] - draw.textbbox((0,0), text, font=info_font)[0], margin)
                draw.text((lx, y), text, font=info_font, fill=info_fill)
                y += 46

        if cta:
            y += 30
            cta_font = get_font(36, bold=True)
            bbox = draw.textbbox((0, 0), cta, font=cta_font)
            tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
            pad_x, pad_y = 40, 14
            bx = _text_anchor_x(align, w, tw + pad_x*2, margin)
            draw.rounded_rectangle([bx, y, bx + tw + pad_x*2, y + th + pad_y*2], radius=6, fill=accent)
            draw.text((bx + pad_x, y + pad_y - 2), cta, font=cta_font, fill=(255, 255, 255))
            y += th + pad_y * 2 + 20

        _draw_logo(draw, img, logo_path, (margin if align != "right" else w - margin - 180, 30), max_size=(160, 80))
        _draw_qr(img, website, (margin if align != "right" else w - margin - 120, h - 180), size=120)

    # ========================================================================
    # SOCIAL
    # ========================================================================
    elif layout == "social":
        if not image_path:
            c1 = accent
            c2 = bg
            bg_img = create_gradient(size, c1, c2, direction="horizontal")
            img = bg_img.convert("RGBA")
            draw = ImageDraw.Draw(img)

        base_size = 86 if len(headline) < 15 else 68
        hl_font_size = int(base_size * cfg["headline_scale"])
        hl_font = get_font(hl_font_size, bold=True)
        hl_lines = wrap_text(draw, headline, hl_font, content_w)
        hl_height = len(hl_lines[:3]) * (hl_font_size + 10)

        body_height = 0
        body_line_h = 42
        if body:
            body_font = get_font(34)
            body_lines = wrap_text(draw, body, body_font, content_w)
            body_height = 20 + len(body_lines[:3]) * body_line_h

        info_height = 30 + 50 if (date_str or time_str) else 0
        loc_height = 55 if loc_str else 0

        cta_height = 0
        if cta:
            cta_font = get_font(34, bold=True)
            cbbox = draw.textbbox((0, 0), cta, font=cta_font)
            cta_height = 20 + (cbbox[3] - cbbox[1]) + 20 + 20

        total_text_h = hl_height + body_height + info_height + loc_height + cta_height + 40
        panel_y = anchor_y - 25
        panel_x = margin - 25
        panel_w = content_w + 50
        panel_h = total_text_h

        loc_fill = (200, 200, 200) if (bg_brightness > 180 or image_path) else (90, 90, 90)
        draw_text_panel(draw, img, panel_x, panel_y, panel_w, panel_h, radius=20, fill=panel_fill)

        y = anchor_y
        for line in hl_lines[:3]:
            bbox = draw.textbbox((0, 0), line, font=hl_font)
            tw = bbox[2] - bbox[0]
            x = _text_anchor_x(align, w, tw, margin)
            draw.text((x, y), line, font=hl_font, fill=text_fill)
            y += hl_font_size + 10

        y += 20
        if body:
            body_font = get_font(34)
            for line in wrap_text(draw, body, body_font, content_w)[:3]:
                bbox = draw.textbbox((0, 0), line, font=body_font)
                tw = bbox[2] - bbox[0]
                x = _text_anchor_x(align, w, tw, margin)
                draw.text((x, y), line, font=body_font, fill=body_fill)
                y += body_line_h

        y += 30
        if date_str or time_str:
            info = "  |  ".join([p for p in [date_str, time_str] if p])
            font = get_font(30)
            bbox = draw.textbbox((0, 0), info, font=font)
            tw = bbox[2] - bbox[0]
            x = _text_anchor_x(align, w, tw, margin)
            draw.text((x, y), info, font=font, fill=info_fill)
            y += 50

        if loc_str:
            font = get_font(28)
            bbox = draw.textbbox((0, 0), loc_str, font=font)
            tw = bbox[2] - bbox[0]
            x = _text_anchor_x(align, w, tw, margin)
            draw.text((x, y), loc_str, font=font, fill=loc_fill)
            y += 55

        if cta:
            cta_font = get_font(34, bold=True)
            bbox = draw.textbbox((0, 0), cta, font=cta_font)
            tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
            pad = 34
            bx = _text_anchor_x(align, w, tw + pad*2, margin)
            by = y + 20
            draw.rounded_rectangle([bx, by, bx + tw + pad*2, by + th + 20], radius=8, fill=(255, 255, 255))
            draw.text((bx + pad, by + 8), cta, font=cta_font, fill=accent)

        _draw_logo(draw, img, logo_path, (w - 180, 20), max_size=(160, 80))
        _draw_qr(img, website, (margin, h - 160), size=120)

    # ========================================================================
    # SPLIT — left half image, right half text (or vice versa)
    # ========================================================================
    elif layout == "split":
        split_x = w // 2
        if image_path:
            # Darken the image side slightly for contrast
            overlay = Image.new('RGBA', (split_x, h), (0, 0, 0, 30))
            img.paste(overlay, (0, 0), overlay)

        # Right side panel
        panel_fill_split = (255, 255, 255, 245) if not image_path else (250, 250, 252, 240)
        draw_text_panel(draw, img, split_x + 20, 40, w - split_x - 40, h - 80, radius=16, fill=panel_fill_split)

        text_margin = split_x + 60
        right_w = w - text_margin - 60
        y = anchor_y

        base_size = 88 if len(headline) < 20 else 68
        hl_font_size = int(base_size * cfg["headline_scale"])
        hl_font = get_font(hl_font_size, bold=True)
        hl_lines = wrap_text(draw, headline, hl_font, right_w)
        for line in hl_lines[:3]:
            bbox = draw.textbbox((0, 0), line, font=hl_font)
            tw = bbox[2] - bbox[0]
            x = text_margin + (right_w - tw) // 2
            draw.text((x, y), line, font=hl_font, fill=(30, 30, 30))
            y += hl_font_size + 12

        y += 25
        if body:
            body_font = get_font(34)
            for line in wrap_text(draw, body, body_font, right_w)[:4]:
                bbox = draw.textbbox((0, 0), line, font=body_font)
                tw = bbox[2] - bbox[0]
                x = text_margin + (right_w - tw) // 2
                draw.text((x, y), line, font=body_font, fill=(50, 50, 50))
                y += 44

        y += 30
        if info_parts:
            info_text = "  |  ".join(info_parts)
            font = get_font(28)
            bbox = draw.textbbox((0, 0), info_text, font=font)
            tw = bbox[2] - bbox[0]
            x = text_margin + (right_w - tw) // 2
            draw.text((x, y), info_text, font=font, fill=(70, 70, 70))
            y += 50

        if cta:
            y += 25
            cta_font = get_font(36, bold=True)
            bbox = draw.textbbox((0, 0), cta, font=cta_font)
            tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
            pad_x, pad_y = 45, 16
            bx = text_margin + (right_w - tw - pad_x*2) // 2
            draw.rounded_rectangle([bx, y, bx + tw + pad_x*2, y + th + pad_y*2], radius=8, fill=accent)
            draw.text((bx + pad_x, y + pad_y - 2), cta, font=cta_font, fill=(255, 255, 255))

        _draw_logo(draw, img, logo_path, (30, 30), max_size=(160, 80))
        _draw_qr(img, website, (w - 170, h - 170), size=130)

    # ========================================================================
    # CLASSIC — elegant centered with ornamental lines
    # ========================================================================
    elif layout == "classic":
        # Ornamental top and bottom lines
        line_y1 = 60
        line_y2 = h - 60
        draw.line([(margin, line_y1), (w - margin, line_y1)], fill=accent, width=3)
        draw.line([(margin, line_y2), (w - margin, line_y2)], fill=accent, width=3)
        # Small diamond accents
        diamond_size = 8
        for dx in [margin, w // 2, w - margin]:
            draw.polygon([(dx, line_y1 - diamond_size), (dx + diamond_size, line_y1),
                          (dx, line_y1 + diamond_size), (dx - diamond_size, line_y1)], fill=accent)
            draw.polygon([(dx, line_y2 - diamond_size), (dx + diamond_size, line_y2),
                          (dx, line_y2 + diamond_size), (dx - diamond_size, line_y2)], fill=accent)

        base_size = 92 if len(headline) < 20 else 72
        hl_font_size = int(base_size * cfg["headline_scale"])
        hl_font = get_font(hl_font_size, bold=True)
        hl_lines = wrap_text(draw, headline, hl_font, content_w)
        hl_height = len(hl_lines[:3]) * (hl_font_size + 14)

        body_height = 0
        body_line_h = 46
        if body:
            body_font = get_font(36)
            body_lines = wrap_text(draw, body, body_font, content_w)
            body_height = 25 + len(body_lines[:4]) * body_line_h

        info_height = 35 + 55 if info_parts else 0
        cta_height = 0
        if cta:
            cta_font = get_font(38, bold=True)
            cbbox = draw.textbbox((0, 0), cta, font=cta_font)
            cta_height = 25 + (cbbox[3] - cbbox[1]) + 36 + 30

        total_text_h = hl_height + body_height + info_height + cta_height + 50
        panel_y = anchor_y - 35
        panel_x = margin - 30
        panel_w = content_w + 60
        panel_h = total_text_h

        # Classic uses a warm cream panel
        classic_fill = (255, 252, 245, 235) if image_path else (255, 252, 245, 245)
        draw_text_panel(draw, img, panel_x, panel_y, panel_w, panel_h, radius=4, fill=classic_fill)

        y = anchor_y
        for line in hl_lines[:3]:
            bbox = draw.textbbox((0, 0), line, font=hl_font)
            tw = bbox[2] - bbox[0]
            x = _text_anchor_x("center", w, tw, margin)
            draw.text((x, y), line, font=hl_font, fill=(40, 30, 20))
            y += hl_font_size + 14

        if body:
            y += 25
            body_font = get_font(36)
            for line in wrap_text(draw, body, body_font, content_w)[:4]:
                bbox = draw.textbbox((0, 0), line, font=body_font)
                tw = bbox[2] - bbox[0]
                x = _text_anchor_x("center", w, tw, margin)
                draw.text((x, y), line, font=body_font, fill=(60, 50, 40))
                y += body_line_h

        y += 35
        if info_parts:
            info_text = "  |  ".join(info_parts)
            font = get_font(30)
            bbox = draw.textbbox((0, 0), info_text, font=font)
            tw = bbox[2] - bbox[0]
            x = _text_anchor_x("center", w, tw, margin)
            draw.text((x, y), info_text, font=font, fill=(80, 70, 60))
            y += 55

        if cta:
            y += 25
            cta_font = get_font(38, bold=True)
            bbox = draw.textbbox((0, 0), cta, font=cta_font)
            tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
            pad_x, pad_y = 50, 18
            bx = _text_anchor_x("center", w, tw + pad_x*2, margin)
            draw.rounded_rectangle([bx, y, bx + tw + pad_x*2, y + th + pad_y*2], radius=4, fill=accent)
            draw.text((bx + pad_x, y + pad_y - 2), cta, font=cta_font, fill=(255, 255, 255))

        _draw_logo(draw, img, logo_path, (w - 200, 70), max_size=(160, 80))
        _draw_qr(img, website, (margin, h - 170), size=130)

    # ========================================================================
    # MINIMAL — solid color, no image, clean typography
    # ========================================================================
    elif layout == "minimal":
        # Solid color background — no gradient, no image
        solid_bg = Image.new('RGB', size, bg)
        img = solid_bg.convert("RGBA")
        draw = ImageDraw.Draw(img)

        # Accent line top
        draw.rectangle([0, 0, w, 8], fill=accent)

        base_size = 100 if len(headline) < 20 else 78
        hl_font_size = int(base_size * cfg["headline_scale"])
        hl_font = get_font(hl_font_size, bold=True)
        hl_lines = wrap_text(draw, headline, hl_font, content_w)
        hl_height = len(hl_lines[:3]) * (hl_font_size + 16)

        body_height = 0
        body_line_h = 50
        if body:
            body_font = get_font(40)
            body_lines = wrap_text(draw, body, body_font, content_w)
            body_height = 30 + len(body_lines[:4]) * body_line_h

        info_height = 40 + 60 if info_parts else 0
        cta_height = 0
        if cta:
            cta_font = get_font(40, bold=True)
            cbbox = draw.textbbox((0, 0), cta, font=cta_font)
            cta_height = 30 + (cbbox[3] - cbbox[1]) + 40 + 30

        total_text_h = hl_height + body_height + info_height + cta_height + 60
        panel_y = anchor_y - 40

        # No panel in minimal — text sits directly on solid color
        y = anchor_y
        for line in hl_lines[:3]:
            bbox = draw.textbbox((0, 0), line, font=hl_font)
            tw = bbox[2] - bbox[0]
            x = _text_anchor_x("center", w, tw, margin)
            draw.text((x, y), line, font=hl_font, fill=accent)
            y += hl_font_size + 16

        if body:
            y += 30
            body_font = get_font(40)
            for line in wrap_text(draw, body, body_font, content_w)[:4]:
                bbox = draw.textbbox((0, 0), line, font=body_font)
                tw = bbox[2] - bbox[0]
                x = _text_anchor_x("center", w, tw, margin)
                draw.text((x, y), line, font=body_font, fill=(60, 60, 60))
                y += body_line_h

        y += 40
        if info_parts:
            info_text = "  |  ".join(info_parts)
            font = get_font(32)
            bbox = draw.textbbox((0, 0), info_text, font=font)
            tw = bbox[2] - bbox[0]
            x = _text_anchor_x("center", w, tw, margin)
            draw.text((x, y), info_text, font=font, fill=(100, 100, 100))
            y += 60

        if cta:
            y += 30
            cta_font = get_font(40, bold=True)
            bbox = draw.textbbox((0, 0), cta, font=cta_font)
            tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
            pad_x, pad_y = 55, 20
            bx = _text_anchor_x("center", w, tw + pad_x*2, margin)
            draw.rounded_rectangle([bx, y, bx + tw + pad_x*2, y + th + pad_y*2], radius=6, fill=accent)
            draw.text((bx + pad_x, y + pad_y - 2), cta, font=cta_font, fill=(255, 255, 255))

        _draw_logo(draw, img, logo_path, (w - 220, 30), max_size=(180, 90))
        _draw_qr(img, website, (w - 180, h - 180), size=140)

    # Finalize
    final = img.convert("RGB")
    buf = io.BytesIO()
    final.save(buf, format="PNG", quality=95)
    buf.seek(0)
    return buf.getvalue()


def png_to_pdf(png_bytes: bytes) -> bytes:
    import img2pdf
    buf = io.BytesIO()
    buf.write(img2pdf.convert(png_bytes))
    buf.seek(0)
    return buf.getvalue()

import io
import base64
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import qrcode
import colorsys

# Layout dimensions
SIZES = {
    "poster": (1275, 1650),   # 8.5x11 @ 150dpi
    "modern": (1275, 1650),
    "social": (1080, 1080),
}

VIBE_COLORS = {
    "Whimsical": ("#FF6B9D", "#FFF0F5"),
    "Modern & Sleek": ("#1a1a2e", "#f5f5f7"),
    "Vintage Scholastic": ("#8B4513", "#F5F5DC"),
    "High-Energy": ("#FF4500", "#FFF8DC"),
    "Calm & Relaxing": ("#4682B4", "#F0F8FF"),
    "Festive": ("#DAA520", "#FFF8DC"),
}

def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def get_font(size, bold=False):
    """Try to load DejaVu fonts, fall back to default."""
    try:
        name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
        return ImageFont.truetype(f"/usr/share/fonts/truetype/dejavu/{name}", size)
    except Exception:
        try:
            return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", size)
        except Exception:
            return ImageFont.load_default()

def create_gradient(size, color1, color2, direction="vertical"):
    """Create a simple gradient background."""
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

def darken_for_text(img, region, factor=0.5):
    """Darken a region so white text is readable."""
    overlay = Image.new('RGBA', img.size, (0, 0, 0, int(255 * factor)))
    mask = Image.new('L', img.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rectangle(region, fill=int(255 * factor))
    img.paste(Image.blend(img.convert('RGBA'), overlay, 0.3), mask=mask)
    return img

def wrap_text(draw, text, font, max_width):
    """Simple word wrap."""
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

def render_flyer(fields: dict, layout: str = "poster") -> bytes:
    """
    Render a flyer to PNG bytes.
    fields: headline, body_text, cta_text, date, time, location, website, image_path (optional), accent_color
    """
    size = SIZES.get(layout, SIZES["poster"])
    w, h = size
    
    # Determine colors from vibe or accent
    vibe = fields.get("vibe", "Modern & Sleek")
    accent_hex = fields.get("accent_color", VIBE_COLORS.get(vibe, ("#6366f1", "#f5f5f7"))[0])
    bg_hex = fields.get("bg_color", VIBE_COLORS.get(vibe, ("#6366f1", "#f5f5f7"))[1])
    accent = hex_to_rgb(accent_hex)
    bg = hex_to_rgb(bg_hex)
    
    # Create base image
    image_path = fields.get("image_path")
    if image_path:
        try:
            bg_img = Image.open(image_path).convert("RGB")
            bg_img = bg_img.resize(size, Image.LANCZOS)
        except Exception:
            bg_img = create_gradient(size, bg, (255, 255, 255))
    else:
        # Create a subtle gradient background
        c1 = bg
        c2 = tuple(min(255, int(c * 1.1)) for c in bg)
        bg_img = create_gradient(size, c1, c2)
    
    img = bg_img.convert("RGBA")
    draw = ImageDraw.Draw(img)
    
    # --- LAYOUT: POSTER ---
    if layout == "poster":
        # Top accent bar
        draw.rectangle([0, 0, w, 12], fill=accent)
        
        # Darken bottom third for text
        darken_for_text(img, (0, int(h*0.45), w, h), 0.55)
        
        # Headline - large, centered, upper area
        headline = fields.get("headline", "Event")
        font_size = 80 if len(headline) < 20 else 60
        font = get_font(font_size, bold=True)
        lines = wrap_text(draw, headline, font, w - 120)
        y = int(h * 0.52)
        for line in lines:
            bbox = draw.textbbox((0, 0), line, font=font)
            tw = bbox[2] - bbox[0]
            x = (w - tw) // 2
            draw.text((x, y), line, font=font, fill=(255, 255, 255))
            y += font_size + 10
        
        # Body text
        body = fields.get("body_text", "")
        if body:
            y += 20
            font = get_font(32)
            body_lines = wrap_text(draw, body, font, w - 160)
            for line in body_lines[:4]:
                bbox = draw.textbbox((0, 0), line, font=font)
                tw = bbox[2] - bbox[0]
                x = (w - tw) // 2
                draw.text((x, y), line, font=font, fill=(240, 240, 240))
                y += 38
        
        # Date/Time block
        y += 30
        date_str = fields.get("date", "")
        time_str = fields.get("time", "")
        loc_str = fields.get("location", "")
        info_parts = [p for p in [date_str, time_str, loc_str] if p]
        if info_parts:
            info_text = "  |  ".join(info_parts)
            font = get_font(28)
            bbox = draw.textbbox((0, 0), info_text, font=font)
            tw = bbox[2] - bbox[0]
            x = (w - tw) // 2
            draw.text((x, y), info_text, font=font, fill=(220, 220, 220))
            y += 50
        
        # CTA button area
        cta = fields.get("cta_text", "")
        if cta:
            font = get_font(36, bold=True)
            bbox = draw.textbbox((0, 0), cta, font=font)
            tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
            pad_x, pad_y = 50, 20
            bx = (w - tw) // 2 - pad_x
            by = y + 20
            draw.rounded_rectangle([bx, by, bx + tw + pad_x*2, by + th + pad_y*2], radius=8, fill=accent)
            draw.text((bx + pad_x, by + pad_y - 4), cta, font=font, fill=(255, 255, 255))
            y = by + th + pad_y * 2 + 30
        
        # QR code
        website = fields.get("website", "")
        if website:
            try:
                qr = qrcode.make(website, box_size=4, border=2)
                qr = qr.resize((140, 140))
                img.paste(qr, (w - 180, h - 180))
                font = get_font(18)
                draw.text((w - 180, h - 40), "Scan for details", font=font, fill=(200, 200, 200))
            except Exception:
                pass
        
        # Library branding
        font = get_font(22)
        draw.text((60, h - 50), "Your Library", font=font, fill=(200, 200, 200))
    
    # --- LAYOUT: MODERN ---
    elif layout == "modern":
        # Left accent bar
        draw.rectangle([0, 0, 16, h], fill=accent)
        
        if image_path:
            darken_for_text(img, (0, 0, w, h), 0.35)
        
        margin = 80
        y = 120
        
        # Small label
        font = get_font(24)
        draw.text((margin, y), "UPCOMING EVENT", font=font, fill=accent)
        y += 50
        
        # Headline - left aligned, large
        headline = fields.get("headline", "Event")
        font_size = 90 if len(headline) < 20 else 70
        font = get_font(font_size, bold=True)
        lines = wrap_text(draw, headline, font, w - margin * 2)
        for line in lines[:3]:
            draw.text((margin, y), line, font=font, fill=(255, 255, 255))
            y += font_size + 12
        
        y += 30
        body = fields.get("body_text", "")
        if body:
            font = get_font(30)
            body_lines = wrap_text(draw, body, font, w - margin * 2)
            for line in body_lines[:5]:
                draw.text((margin, y), line, font=font, fill=(230, 230, 230))
                y += 40
        
        # Info block
        y += 40
        date_str = fields.get("date", "")
        time_str = fields.get("time", "")
        loc_str = fields.get("location", "")
        font = get_font(26)
        for label, val in [("DATE", date_str), ("TIME", time_str), ("LOCATION", loc_str)]:
            if val:
                draw.text((margin, y), f"{label}:  {val}", font=font, fill=(210, 210, 210))
                y += 42
        
        # CTA
        cta = fields.get("cta_text", "")
        if cta:
            y += 30
            font = get_font(32, bold=True)
            bbox = draw.textbbox((0, 0), cta, font=font)
            tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
            pad_x, pad_y = 40, 14
            draw.rounded_rectangle([margin, y, margin + tw + pad_x*2, y + th + pad_y*2], radius=6, fill=accent)
            draw.text((margin + pad_x, y + pad_y - 2), cta, font=font, fill=(255, 255, 255))
            y += th + pad_y * 2 + 20
        
        # QR
        website = fields.get("website", "")
        if website:
            try:
                qr = qrcode.make(website, box_size=4, border=2)
                qr = qr.resize((120, 120))
                img.paste(qr, (margin, h - 180))
            except Exception:
                pass
    
    # --- LAYOUT: SOCIAL ---
    else:
        # Square format, centered, compact
        if image_path:
            darken_for_text(img, (0, 0, w, h), 0.4)
        else:
            # Create a radial-ish gradient
            c1 = accent
            c2 = bg
            bg_img = create_gradient(size, c1, c2, direction="horizontal")
            img = bg_img.convert("RGBA")
            draw = ImageDraw.Draw(img)
        
        margin = 70
        y = 100
        
        # Headline
        headline = fields.get("headline", "Event")
        font_size = 72 if len(headline) < 15 else 56
        font = get_font(font_size, bold=True)
        lines = wrap_text(draw, headline, font, w - margin * 2)
        for line in lines[:3]:
            bbox = draw.textbbox((0, 0), line, font=font)
            tw = bbox[2] - bbox[0]
            x = (w - tw) // 2
            draw.text((x, y), line, font=font, fill=(255, 255, 255))
            y += font_size + 10
        
        # Body
        y += 20
        body = fields.get("body_text", "")
        if body:
            font = get_font(28)
            body_lines = wrap_text(draw, body, font, w - margin * 2)
            for line in body_lines[:3]:
                bbox = draw.textbbox((0, 0), line, font=font)
                tw = bbox[2] - bbox[0]
                x = (w - tw) // 2
                draw.text((x, y), line, font=font, fill=(240, 240, 240))
                y += 36
        
        # Date/Time
        y += 30
        date_str = fields.get("date", "")
        time_str = fields.get("time", "")
        if date_str or time_str:
            info = "  |  ".join([p for p in [date_str, time_str] if p])
            font = get_font(26)
            bbox = draw.textbbox((0, 0), info, font=font)
            tw = bbox[2] - bbox[0]
            x = (w - tw) // 2
            draw.text((x, y), info, font=font, fill=(220, 220, 220))
            y += 45
        
        # Location
        loc_str = fields.get("location", "")
        if loc_str:
            font = get_font(24)
            bbox = draw.textbbox((0, 0), loc_str, font=font)
            tw = bbox[2] - bbox[0]
            x = (w - tw) // 2
            draw.text((x, y), loc_str, font=font, fill=(200, 200, 200))
            y += 50
        
        # CTA
        cta = fields.get("cta_text", "")
        if cta:
            font = get_font(30, bold=True)
            bbox = draw.textbbox((0, 0), cta, font=font)
            tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
            pad = 30
            bx = (w - tw) // 2 - pad
            by = y + 20
            draw.rounded_rectangle([bx, by, bx + tw + pad*2, by + th + 20], radius=8, fill=(255, 255, 255))
            draw.text((bx + pad, by + 8), cta, font=font, fill=accent)
    
    # Finalize: convert to RGB and save to bytes
    final = img.convert("RGB")
    buf = io.BytesIO()
    final.save(buf, format="PNG", quality=95)
    buf.seek(0)
    return buf.getvalue()

def png_to_pdf(png_bytes: bytes) -> bytes:
    """Convert PNG bytes to PDF bytes."""
    import img2pdf
    buf = io.BytesIO()
    buf.write(img2pdf.convert(png_bytes))
    buf.seek(0)
    return buf.getvalue()

from pydantic import BaseModel
from typing import Optional

class GenerateRequest(BaseModel):
    event_name: str
    event_description: str = ""
    theme: str = ""
    audience: str = "All Ages"
    vibe: str = "Modern & Sleek"
    date: str = ""
    time: str = ""
    timezone: str = ""
    location: str = ""
    website: str = ""
    layout: str = "poster"  # poster | modern | social | split | classic | minimal
    include_image: bool = True
    background_description: str = ""
    logo_base64: str = ""

class SaveRequest(BaseModel):
    event_name: str
    event_description: str = ""
    theme: str = ""
    audience: str = "All Ages"
    vibe: str = "Modern & Sleek"
    date: str = ""
    time: str = ""
    timezone: str = ""
    location: str = ""
    website: str = ""
    layout: str = "poster"
    include_image: bool = True
    background_description: str = ""
    logo_base64: str = ""
    headline: str = ""
    body_text: str = ""
    cta_text: str = ""
    image_url: Optional[str] = None
    png_base64: str = ""

class FlyerUpdateRequest(BaseModel):
    headline: Optional[str] = None
    body_text: Optional[str] = None
    cta_text: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    timezone: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None
    layout: str = "poster"
    vibe: str = "Modern & Sleek"
    accent_color: str = "#6366f1"

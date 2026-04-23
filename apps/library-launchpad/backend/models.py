from pydantic import BaseModel
from typing import Optional, Union


class GenerateRequest(BaseModel):
    topic: str
    generate_image: bool = False
    target_audience: str = "All Ages"
    budget: str = "$50 — Small Event"


class CardOut(BaseModel):
    id: Optional[Union[int, str]] = None
    card_type: str
    content: dict
    pinned: bool = False
    position: int = 0


class MediaOut(BaseModel):
    id: Optional[int] = None
    title: str
    author: Optional[str] = None
    media_type: Optional[str] = None
    cover_url: Optional[str] = None
    openlibrary_key: Optional[str] = None


class GenerateResponse(BaseModel):
    campaign_id: int
    topic: str
    image_url: Optional[str] = None
    media: list[MediaOut]
    cards: list[CardOut]


class RerollRequest(BaseModel):
    campaign_id: Union[str, int]
    card_id: Optional[Union[str, int]] = None  # None = reroll all


class CampaignListItem(BaseModel):
    id: int
    topic: str
    card_count: int
    created_at: str
    target_audience: str = "All Ages"
    budget: str = "$50 — Small Event"


class SaveRequest(BaseModel):
    """Validated request body for saving a campaign."""
    topic: str
    media: list[dict] = []
    cards: list[dict] = []
    target_audience: str = "All Ages"
    budget: str = "$50 — Small Event"
    relevant_dates: list[dict] = []
    cross_media_connections: list[dict] = []

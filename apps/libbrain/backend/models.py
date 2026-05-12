from pydantic import BaseModel


class AskRequest(BaseModel):
    question: str
    branch_id: str | None = None


class AskResponse(BaseModel):
    answer: str
    category: str
    counted: bool


class CampaignRequest(BaseModel):
    topic: str
    audience: str
    style: str
    include_image_prompt: bool = False


class PlatformContent(BaseModel):
    text: str
    image_prompt: str | None = None


class CampaignResponse(BaseModel):
    content: str
    campaign_id: int
    platforms: dict[str, PlatformContent] | None = None


class StatsResponse(BaseModel):
    daily: int
    weekly: int
    monthly: int
    by_category: dict[str, int]

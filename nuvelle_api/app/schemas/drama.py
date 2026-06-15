from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DramaRead(BaseModel):
    id: int
    title: str
    platform: str | None = None
    genre: str | None = None
    cover_image_url: str | None = None
    video_url: str | None = None
    source_url: str | None = None
    episode_count: int | None = None
    synopsis_or_hook: str | None = None
    signal: str | None = None
    rs_book_id: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

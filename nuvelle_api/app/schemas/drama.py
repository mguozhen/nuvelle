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
    video_transfer_status: str | None = None
    video_transfer_total_episodes: int | None = None
    video_transfer_done_episodes: int | None = None
    video_transfer_failed_episodes: int | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DramaEpisodeRead(BaseModel):
    id: int
    episode_no: int
    play_url: str | None = None
    poster_url: str | None = None
    video_transfer_status: str | None = None

    model_config = ConfigDict(from_attributes=True)


class DramaDetailRead(DramaRead):
    language: str | None = None
    episodes: list[DramaEpisodeRead] = []

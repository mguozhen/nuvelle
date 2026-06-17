from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ReelShortSyncRequest(BaseModel):
    resource_id: int | None = None
    limit: int = Field(default=50, ge=1, le=500)
    dry_run: bool = False


class ReelShortSyncResponse(BaseModel):
    imported: int = 0
    updated: int = 0
    skipped: int = 0
    failed: int = 0


class AdminEpisodeRead(BaseModel):
    id: int
    episode_no: int
    chapter_id: str | None = None
    t_chapter_id: str | None = None
    play_url: str | None = None
    poster_url: str | None = None
    iframe_src: str | None = None


class AdminDramaRead(BaseModel):
    id: int
    title: str
    platform: str | None = None
    language: str | None = None
    tags: list[str] = Field(default_factory=list)
    show_tags: list[str] = Field(default_factory=list)
    cover_image_url: str | None = None
    synopsis_or_hook: str | None = None
    episode_count: int | None = None
    rs_book_id: str | None = None
    recent_revenue: int | None = None
    promoters_cnt: int | None = None
    pay_start: int | None = None
    promotion_code: str | None = None
    app_promotion_link: str | None = None
    book_promotion_link: str | None = None
    platform_publish_at: datetime | None = None
    has_video: bool = False
    seen: bool = False
    generated_count: int = 0


class AdminDramaListResponse(BaseModel):
    items: list[AdminDramaRead]
    total: int


class AdminDramaDetail(AdminDramaRead):
    episodes: list[AdminEpisodeRead] = Field(default_factory=list)


class DramaEventCreate(BaseModel):
    drama_id: int
    episode_id: int | None = None
    event_type: str
    verdict: str | None = None
    score: int | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class DramaEventResponse(BaseModel):
    ok: bool
    event_id: int


class GeneratedDramaRef(BaseModel):
    id: int
    title: str


class GeneratedEpisodeRef(BaseModel):
    id: int
    episode_no: int


class GeneratedFiles(BaseModel):
    teaser: str | None = None
    cover: str | None = None


class GeneratedJobRead(BaseModel):
    id: str
    job_id: str
    status: str
    title: str
    episode: int
    duration: int
    source_url: str | None = None
    prompt: str | None = None
    caption: str | None = None
    error: str | None = None
    files: GeneratedFiles | None = None
    drama: GeneratedDramaRef | None = None
    episode_ref: GeneratedEpisodeRef | None = None
    created_at: datetime


class GeneratedListResponse(BaseModel):
    items: list[GeneratedJobRead]
    total: int

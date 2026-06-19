from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ReelShortSyncRequest(BaseModel):
    resource_id: int | None = None
    limit: int = Field(default=50, ge=1, le=50000)
    detail_only: bool = False
    start_after_resource_id: int | None = Field(default=None, ge=0)
    dry_run: bool = False


class ReelShortSyncResponse(BaseModel):
    scanned: int = 0
    imported: int = 0
    updated: int = 0
    skipped: int = 0
    failed: int = 0
    last_resource_id: int | None = None


class AdminEpisodeRead(BaseModel):
    id: int
    episode_no: int
    chapter_id: str | None = None
    t_chapter_id: str | None = None
    play_url: str | None = None
    poster_url: str | None = None
    iframe_src: str | None = None
    generation_status: str | None = None
    generation_progress: int = 0


class AdminDramaRead(BaseModel):
    id: int
    title: str
    platform: str | None = None
    genre: str | None = None
    language: str | None = None
    tags: list[str] = Field(default_factory=list)
    show_tags: list[str] = Field(default_factory=list)
    cover_image_url: str | None = None
    video_url: str | None = None
    synopsis_or_hook: str | None = None
    signal: str | None = None
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
    generation_status: str | None = None
    generation_progress: int = 0


class AdminDramaListResponse(BaseModel):
    items: list[AdminDramaRead]
    total: int


class AdminDramaFilterOptions(BaseModel):
    platforms: list[str] = Field(default_factory=list)
    languages: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)


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
    progress: int = 0
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

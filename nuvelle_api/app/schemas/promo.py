from pydantic import BaseModel, Field


class PromoJobCreate(BaseModel):
    video_url: str | None = None
    url: str | None = None
    title: str = "Promo"
    ep: int = 1
    dur: int = 13
    beats: list[float] = Field(default_factory=list)
    prompt: str = ""
    cover_url: str = ""
    cover_image: str = ""
    no_ai: bool = False
    drama_id: int | None = None
    episode_id: int | None = None


class PromoJobFiles(BaseModel):
    teaser: str | None = None
    cover: str | None = None


class PromoJobResponse(BaseModel):
    id: str
    job_id: str
    status: str
    progress: int = 0
    files: PromoJobFiles | None = None
    caption: str | None = None
    title: str | None = None
    tt_safe: bool = True
    tt_notes: str = ""
    cover_warn: str = ""
    log: str | None = None
    error: str | None = None


class PromoBatchCreate(BaseModel):
    title: str = "Promo"
    dur: int = 13
    cover_url: str = ""
    episodes: dict[str, str] = Field(default_factory=dict)


class PromoBatchJob(BaseModel):
    ep: int
    job_id: str
    status: str | None = None
    files: PromoJobFiles | None = None
    caption: str | None = None
    tt_safe: bool = True
    tt_notes: str = ""


class PromoBatchCreateResponse(BaseModel):
    batch_id: str
    jobs: list[PromoBatchJob]


class PromoBatchResponse(BaseModel):
    batch_id: str
    title: str
    total: int
    done: int
    error: int
    jobs: list[PromoBatchJob]

from pydantic import BaseModel, Field


class VoteCreate(BaseModel):
    drama_id: str | int
    taster: str = "anon"
    verdict: str
    score: int | None = None
    tags: list[str] = Field(default_factory=list)
    ts: float | None = None


class VoteRecord(BaseModel):
    taster: str
    verdict: str
    tags: list[str]
    score: int | None = None
    ts: float | None = None


class VoteCreateResponse(BaseModel):
    ok: bool
    rated: int


class VotesResponse(BaseModel):
    rated: list[str]
    votes: dict[str, list[VoteRecord]]
    count: int

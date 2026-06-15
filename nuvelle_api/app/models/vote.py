from enum import StrEnum

from sqlalchemy import JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import TimestampMixin


class VoteVerdict(StrEnum):
    fire = "fire"
    ok = "ok"
    pass_ = "pass"


class Vote(TimestampMixin, Base):
    __tablename__ = "votes"

    id: Mapped[int] = mapped_column(primary_key=True)
    drama_id: Mapped[str] = mapped_column(String(120), index=True)
    taster: Mapped[str] = mapped_column(String(120), default="anon", index=True)
    verdict: Mapped[str] = mapped_column(String(20), index=True)
    score: Mapped[int | None]
    tags: Mapped[list[str]] = mapped_column(JSON, default=list)

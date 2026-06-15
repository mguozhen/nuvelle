from enum import StrEnum

from sqlalchemy import Boolean, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import TimestampMixin


class PromoJobStatus(StrEnum):
    queued = "queued"
    downloading = "downloading"
    rendering = "rendering"
    done = "done"
    error = "error"


class PromoJob(TimestampMixin, Base):
    __tablename__ = "promo_jobs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    batch_id: Mapped[str | None] = mapped_column(String(64), index=True)
    status: Mapped[str] = mapped_column(String(32), index=True, default=PromoJobStatus.queued.value)
    title: Mapped[str] = mapped_column(String(255))
    episode: Mapped[int] = mapped_column(Integer, default=1)
    duration: Mapped[int] = mapped_column(Integer, default=30)
    source_url: Mapped[str | None] = mapped_column(Text)
    output_dir: Mapped[str | None] = mapped_column(Text)
    teaser_url: Mapped[str | None] = mapped_column(Text)
    cover_url: Mapped[str | None] = mapped_column(Text)
    caption: Mapped[str | None] = mapped_column(Text)
    log: Mapped[str | None] = mapped_column(Text)
    error: Mapped[str | None] = mapped_column(Text)
    tt_safe: Mapped[bool] = mapped_column(Boolean, default=True)
    tt_notes: Mapped[str | None] = mapped_column(Text)
    cover_warn: Mapped[str | None] = mapped_column(Text)

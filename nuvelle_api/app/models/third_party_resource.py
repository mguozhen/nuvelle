from datetime import datetime

from sqlalchemy import JSON, DateTime, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import TimestampMixin


class ThirdPartyDramaResource(TimestampMixin, Base):
    __tablename__ = "third_party_drama_resources"
    __table_args__ = (
        UniqueConstraint(
            "source",
            "external_id",
            "source_app",
            "book_type",
            "language",
            name="uq_third_party_drama_resource_identity",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    source: Mapped[str] = mapped_column(String(80), index=True)
    external_id: Mapped[str] = mapped_column(String(160), index=True)
    source_app: Mapped[str] = mapped_column(String(80), index=True)
    book_type: Mapped[str] = mapped_column(String(40), index=True)
    language: Mapped[str] = mapped_column(String(80), index=True)
    title: Mapped[str] = mapped_column(String(500), index=True)
    cover_url: Mapped[str | None] = mapped_column(Text)
    synopsis: Mapped[str | None] = mapped_column(Text)
    release_date: Mapped[str | None] = mapped_column(String(40), index=True)
    episode_count: Mapped[int | None] = mapped_column(Integer)
    free_episode_count: Mapped[int | None] = mapped_column(Integer)
    internal_drama_id: Mapped[int | None] = mapped_column(Integer, index=True)
    import_status: Mapped[str] = mapped_column(String(40), default="pending", index=True)
    raw_data: Mapped[dict] = mapped_column(JSON)
    raw_hash: Mapped[str] = mapped_column(String(64), index=True)
    first_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    last_changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)

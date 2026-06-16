from datetime import UTC, datetime

from sqlalchemy import JSON, DateTime, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.types import TypeDecorator


class Base(DeclarativeBase):
    pass


class UTCDateTime(TypeDecorator[datetime]):
    impl = DateTime
    cache_ok = True

    def process_bind_param(self, value: datetime | None, dialect) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            return value
        return value.astimezone(UTC).replace(tzinfo=None)

    def process_result_value(self, value: datetime | None, dialect) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            return value.replace(tzinfo=UTC)
        return value.astimezone(UTC)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        UTCDateTime(),
        server_default=func.now(),
        onupdate=func.now(),
    )


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
    first_seen_at: Mapped[datetime] = mapped_column(UTCDateTime(), index=True)
    last_seen_at: Mapped[datetime] = mapped_column(UTCDateTime(), index=True)
    last_changed_at: Mapped[datetime] = mapped_column(UTCDateTime(), index=True)


class ThirdPartyCrawlLog(TimestampMixin, Base):
    __tablename__ = "third_party_crawl_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    source: Mapped[str] = mapped_column(String(80), index=True)
    run_type: Mapped[str] = mapped_column(String(80), index=True)
    status: Mapped[str] = mapped_column(String(40), index=True)
    started_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), index=True)
    finished_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), index=True)
    scanned_count: Mapped[int] = mapped_column(Integer, default=0)
    changed_count: Mapped[int] = mapped_column(Integer, default=0)
    error_count: Mapped[int] = mapped_column(Integer, default=0)
    message: Mapped[str | None] = mapped_column(Text)
    log_metadata: Mapped[dict | None] = mapped_column("metadata", JSON)

from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import TimestampMixin


class Drama(TimestampMixin, Base):
    __tablename__ = "dramas"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    platform: Mapped[str | None] = mapped_column(String(80), index=True)
    genre: Mapped[str | None] = mapped_column(String(255), index=True)
    cover_image_url: Mapped[str | None] = mapped_column(Text)
    source_cover_image_url: Mapped[str | None] = mapped_column(Text)
    cover_gcs_uri: Mapped[str | None] = mapped_column(Text)
    cover_transfer_status: Mapped[str | None] = mapped_column(String(40), index=True)
    cover_transfer_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    cover_transfer_error: Mapped[str | None] = mapped_column(Text)
    video_url: Mapped[str | None] = mapped_column(Text)
    source_url: Mapped[str | None] = mapped_column(Text)
    episode_count: Mapped[int | None] = mapped_column(Integer)
    synopsis_or_hook: Mapped[str | None] = mapped_column(Text)
    signal: Mapped[str | None] = mapped_column(Text)
    rs_book_id: Mapped[str | None] = mapped_column(String(120), index=True)
    source_resource_id: Mapped[int | None] = mapped_column(Integer, index=True)
    language: Mapped[str | None] = mapped_column(String(80), index=True)
    tags: Mapped[list[str]] = mapped_column(JSON, default=list)
    show_tags: Mapped[list[str]] = mapped_column(JSON, default=list)
    book_type: Mapped[str | None] = mapped_column(String(40), index=True)
    is_valid: Mapped[bool | None] = mapped_column(Boolean)
    pay_start: Mapped[int | None] = mapped_column(Integer)
    recent_revenue: Mapped[int | None] = mapped_column(Integer, index=True)
    promoters_cnt: Mapped[int | None] = mapped_column(Integer, index=True)
    promotion_code: Mapped[str | None] = mapped_column(String(80), index=True)
    app_promotion_link: Mapped[str | None] = mapped_column(Text)
    book_promotion_link: Mapped[str | None] = mapped_column(Text)
    platform_publish_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    source_first_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    source_last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    source_last_changed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    video_transfer_status: Mapped[str | None] = mapped_column(String(40), index=True)
    video_transfer_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    video_transfer_finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    video_transfer_error: Mapped[str | None] = mapped_column(Text)
    video_transfer_total_episodes: Mapped[int | None] = mapped_column(Integer)
    video_transfer_done_episodes: Mapped[int | None] = mapped_column(Integer)
    video_transfer_failed_episodes: Mapped[int | None] = mapped_column(Integer)


class DramaEpisode(TimestampMixin, Base):
    __tablename__ = "drama_episodes"
    __table_args__ = (UniqueConstraint("drama_id", "episode_no", name="uq_drama_episodes_drama_episode"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    drama_id: Mapped[int] = mapped_column(ForeignKey("dramas.id"), nullable=False, index=True)
    episode_no: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    chapter_id: Mapped[str | None] = mapped_column(String(160), index=True)
    t_chapter_id: Mapped[str | None] = mapped_column(String(80), index=True)
    play_url: Mapped[str | None] = mapped_column(Text)
    poster_url: Mapped[str | None] = mapped_column(Text)
    iframe_src: Mapped[str | None] = mapped_column(Text)
    content: Mapped[str | None] = mapped_column(Text)
    source_payload_hash: Mapped[str | None] = mapped_column(String(64), index=True)
    source_play_url: Mapped[str | None] = mapped_column(Text)
    gcs_uri: Mapped[str | None] = mapped_column(Text)
    video_transfer_status: Mapped[str | None] = mapped_column(String(40), index=True)
    video_transfer_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    video_transfer_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    video_transfer_error: Mapped[str | None] = mapped_column(Text)
    video_content_length: Mapped[int | None] = mapped_column(Integer)

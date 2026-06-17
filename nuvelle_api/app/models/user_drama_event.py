from enum import StrEnum

from sqlalchemy import JSON, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import TimestampMixin


class UserDramaEventType(StrEnum):
    seen = "seen"
    vote = "vote"
    generate = "generate"


class UserDramaEvent(TimestampMixin, Base):
    __tablename__ = "user_drama_events"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "drama_id",
            "event_type",
            name="uq_user_drama_events_user_drama_type",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("admin_users.id"), nullable=False, index=True)
    drama_id: Mapped[int] = mapped_column(ForeignKey("dramas.id"), nullable=False, index=True)
    episode_id: Mapped[int | None] = mapped_column(ForeignKey("drama_episodes.id"), index=True)
    event_type: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    verdict: Mapped[str | None] = mapped_column(String(20), index=True)
    score: Mapped[int | None] = mapped_column(Integer)
    event_metadata: Mapped[dict] = mapped_column("metadata", JSON, default=dict)

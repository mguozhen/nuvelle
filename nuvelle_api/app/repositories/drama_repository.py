from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.drama import Drama, DramaEpisode


class DramaRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list(self, *, limit: int, offset: int) -> list[Drama]:
        statement = (
            select(Drama)
            .order_by(Drama.created_at.desc(), Drama.id.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(self.db.scalars(statement).all())

    def get(self, drama_id: int) -> Drama | None:
        return self.db.get(Drama, drama_id)

    def episodes_for(self, drama_id: int) -> list[DramaEpisode]:
        statement = (
            select(DramaEpisode)
            .where(DramaEpisode.drama_id == drama_id)
            .order_by(DramaEpisode.episode_no.asc())
        )
        return list(self.db.scalars(statement).all())

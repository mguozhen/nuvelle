from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.drama import Drama


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

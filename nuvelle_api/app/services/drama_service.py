from sqlalchemy.orm import Session

from app.models.drama import Drama
from app.repositories.drama_repository import DramaRepository


class DramaService:
    def __init__(self, db: Session) -> None:
        self.repository = DramaRepository(db)

    def list_dramas(self, *, limit: int, offset: int) -> list[Drama]:
        return self.repository.list(limit=limit, offset=offset)

from sqlalchemy.orm import Session

from app.models.drama import Drama
from app.repositories.drama_repository import DramaRepository
from app.schemas.drama import DramaDetailRead, DramaEpisodeRead, DramaRead


class DramaService:
    def __init__(self, db: Session) -> None:
        self.repository = DramaRepository(db)

    def list_dramas(self, *, limit: int, offset: int) -> list[Drama]:
        return self.repository.list(limit=limit, offset=offset)

    def get_drama_detail(self, drama_id: int) -> DramaDetailRead | None:
        drama = self.repository.get(drama_id)
        if drama is None:
            return None
        return DramaDetailRead(
            **DramaRead.model_validate(drama).model_dump(),
            language=drama.language,
            episodes=[
                DramaEpisodeRead.model_validate(episode)
                for episode in self.repository.episodes_for(drama_id)
            ],
        )

from fastapi import APIRouter, Query

from app.api.deps import DbSession
from app.schemas.drama import DramaRead
from app.services.drama_service import DramaService

router = APIRouter()


@router.get("", response_model=list[DramaRead])
def list_dramas(
    db: DbSession,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> list[DramaRead]:
    dramas = DramaService(db).list_dramas(limit=limit, offset=offset)
    return [DramaRead.model_validate(drama) for drama in dramas]

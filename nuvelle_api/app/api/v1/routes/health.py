from fastapi import APIRouter

from app.api.deps import DbSession
from app.schemas.health import HealthResponse
from app.services.health_service import check_database

router = APIRouter()


@router.get("/health/live", response_model=HealthResponse)
def live() -> HealthResponse:
    return HealthResponse(status="ok", database="not_checked")


@router.get("/health/ready", response_model=HealthResponse)
def ready(db: DbSession) -> HealthResponse:
    check_database(db)
    return HealthResponse(status="ok", database="ok")


@router.get("/health", response_model=HealthResponse)
def health(db: DbSession) -> HealthResponse:
    check_database(db)
    return HealthResponse(status="ok", database="ok")

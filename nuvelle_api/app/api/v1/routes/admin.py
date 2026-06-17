from fastapi import APIRouter, HTTPException, Query

from app.api.deps import AdminOnlyUser, CurrentUser, DbSession
from app.schemas.admin import (
    AdminDramaDetail,
    AdminDramaListResponse,
    AdminDramaRead,
    DramaEventCreate,
    DramaEventResponse,
    GeneratedJobRead,
    GeneratedListResponse,
    ReelShortSyncRequest,
    ReelShortSyncResponse,
)
from app.services.admin_drama_service import AdminDramaService
from app.services.generated_service import GeneratedService
from app.services.reelshort_import_service import ReelShortImportService
from app.services.user_event_service import UserEventService

router = APIRouter()


@router.post("/imports/reelshort/sync", response_model=ReelShortSyncResponse)
def sync_reelshort(
    db: DbSession,
    _user: AdminOnlyUser,
    payload: ReelShortSyncRequest | None = None,
) -> ReelShortSyncResponse:
    return ReelShortImportService(db).sync(payload or ReelShortSyncRequest())


@router.get("/dramas", response_model=AdminDramaListResponse)
def list_admin_dramas(
    db: DbSession,
    user: CurrentUser,
    q: str | None = None,
    platform: str | None = None,
    language: str | None = None,
    tag: str | None = None,
    has_video: bool | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> AdminDramaListResponse:
    return AdminDramaService(db).list_dramas(
        user,
        q=q,
        platform=platform,
        language=language,
        tag=tag,
        has_video=has_video,
        limit=limit,
        offset=offset,
    )


@router.get("/dramas/{drama_id}", response_model=AdminDramaDetail)
def get_admin_drama(drama_id: int, db: DbSession, user: CurrentUser) -> AdminDramaDetail:
    drama = AdminDramaService(db).get_drama(drama_id, user)
    if drama is None:
        raise HTTPException(status_code=404, detail="drama not found")
    return drama


@router.get("/swipe/next", response_model=AdminDramaRead)
def swipe_next(db: DbSession, user: CurrentUser) -> AdminDramaRead:
    drama = AdminDramaService(db).swipe_next(user)
    if drama is None:
        raise HTTPException(status_code=404, detail="no drama available")
    return drama


@router.post("/drama-events", response_model=DramaEventResponse)
def record_drama_event(payload: DramaEventCreate, db: DbSession, user: CurrentUser) -> DramaEventResponse:
    return UserEventService(db).record(user, payload)


@router.get("/generated", response_model=GeneratedListResponse)
def list_generated(
    db: DbSession,
    user: CurrentUser,
    status: str | None = None,
    q: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> GeneratedListResponse:
    return GeneratedService(db).list_jobs(user, status=status, q=q, limit=limit, offset=offset)


@router.get("/generated/{job_id}", response_model=GeneratedJobRead)
def get_generated(job_id: str, db: DbSession, user: CurrentUser) -> GeneratedJobRead:
    return GeneratedService(db).get_job(user, job_id)

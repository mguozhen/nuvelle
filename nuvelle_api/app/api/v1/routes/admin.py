from fastapi import APIRouter

from app.api.deps import AdminOnlyUser, DbSession
from app.schemas.admin import ReelShortSyncRequest, ReelShortSyncResponse
from app.services.reelshort_import_service import ReelShortImportService

router = APIRouter()


@router.post("/imports/reelshort/sync", response_model=ReelShortSyncResponse)
def sync_reelshort(
    db: DbSession,
    _user: AdminOnlyUser,
    payload: ReelShortSyncRequest | None = None,
) -> ReelShortSyncResponse:
    return ReelShortImportService(db).sync(payload or ReelShortSyncRequest())

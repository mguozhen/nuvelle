from pydantic import BaseModel, Field


class ReelShortSyncRequest(BaseModel):
    resource_id: int | None = None
    limit: int = Field(default=50, ge=1, le=500)
    dry_run: bool = False


class ReelShortSyncResponse(BaseModel):
    imported: int = 0
    updated: int = 0
    skipped: int = 0
    failed: int = 0

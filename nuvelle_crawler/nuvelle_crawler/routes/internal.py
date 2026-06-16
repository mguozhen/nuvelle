from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from nuvelle_crawler.config import get_settings
from nuvelle_crawler.db.session import get_db
from nuvelle_crawler.services.planner import CrawlerPlanner
from nuvelle_crawler.services.sync_service import ThirdPartyDramaSyncService
from nuvelle_crawler.sources.registry import get_adapter
from nuvelle_crawler.tasks.enqueuer import CloudTasksEnqueuer

router = APIRouter(prefix="/internal")


class PlanRequest(BaseModel):
    source: str = "reelshort_cps"
    pages: int = Field(default=3, ge=1, le=50)
    languages: list[str] | None = None
    sorts: list[str] | None = None


class ListPageTask(BaseModel):
    source: str
    page: int = Field(ge=1)
    language: str | None = None
    sort: str = "time"


class DetailTask(BaseModel):
    source: str
    external_id: str
    book_type: str = "1"


def get_planner() -> CrawlerPlanner:
    settings = get_settings()
    enqueuer = CloudTasksEnqueuer(
        project=settings.gcp_project,
        location=settings.gcp_location,
        service_url=settings.crawler_base_url,
        service_account_email=settings.cloud_tasks_service_account,
    )
    return CrawlerPlanner(enqueuer=enqueuer, service_url=settings.crawler_base_url)


DbSession = Annotated[Session, Depends(get_db)]
PlannerDep = Annotated[CrawlerPlanner, Depends(get_planner)]


@router.post("/plan/incremental")
def plan_incremental(payload: PlanRequest, planner: PlannerDep) -> dict:
    count = planner.plan_incremental(
        source=payload.source,
        languages=payload.languages,
        sorts=payload.sorts,
        pages=payload.pages,
    )
    return {"ok": True, "enqueued": count}


@router.post("/tasks/list-page")
def sync_list_page(
    payload: ListPageTask,
    db: DbSession,
    planner: PlannerDep,
) -> dict:
    service = ThirdPartyDramaSyncService(db=db, adapter=get_adapter(payload.source), planner=planner)
    summary = service.sync_list_page(
        source=payload.source,
        page=payload.page,
        language=payload.language,
        sort=payload.sort,
    )
    db.commit()
    return {"ok": True, **summary.__dict__}


@router.post("/tasks/detail")
def sync_detail(
    payload: DetailTask,
    db: DbSession,
    planner: PlannerDep,
) -> dict:
    service = ThirdPartyDramaSyncService(db=db, adapter=get_adapter(payload.source), planner=planner)
    summary = service.sync_detail(
        source=payload.source,
        external_id=payload.external_id,
        book_type=payload.book_type,
    )
    db.commit()
    return {"ok": True, **summary.__dict__}

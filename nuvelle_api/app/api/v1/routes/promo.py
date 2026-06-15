from fastapi import APIRouter, BackgroundTasks, Query
from fastapi.responses import FileResponse, Response

from app.api.deps import DbSession
from app.schemas.promo import (
    PromoBatchCreate,
    PromoBatchCreateResponse,
    PromoBatchResponse,
    PromoJobCreate,
    PromoJobResponse,
)
from app.services.promo_service import PromoService

router = APIRouter()


@router.post("/promo/jobs", response_model=PromoJobResponse)
def create_job(payload: PromoJobCreate, background_tasks: BackgroundTasks, db: DbSession) -> PromoJobResponse:
    service = PromoService(db)
    response = service.create_job(payload)
    background_tasks.add_task(service.run_job, response.job_id, payload)
    return response


@router.get("/promo/jobs/{job_id}", response_model=PromoJobResponse)
def get_job(job_id: str, db: DbSession) -> PromoJobResponse:
    return PromoService(db).get_job(job_id)


@router.get("/promo/jobs/{job_id}/files/{filename}")
def get_job_file(job_id: str, filename: str, db: DbSession) -> FileResponse:
    path, media_type = PromoService(db).asset_path(job_id, filename)
    return FileResponse(path, media_type=media_type, filename=path.name)


@router.post("/promo/batches", response_model=PromoBatchCreateResponse)
def create_batch(
    payload: PromoBatchCreate,
    background_tasks: BackgroundTasks,
    db: DbSession,
) -> PromoBatchCreateResponse:
    service = PromoService(db)
    response = service.create_batch(payload)
    for item in response.jobs:
        video_url = payload.episodes[str(item.ep)]
        background_tasks.add_task(
            service.run_job,
            item.job_id,
            PromoJobCreate(
                video_url=video_url,
                title=payload.title,
                ep=item.ep,
                dur=payload.dur,
                cover_url=payload.cover_url,
            ),
        )
    return response


@router.get("/promo/batches/{batch_id}", response_model=PromoBatchResponse)
def get_batch(batch_id: str, db: DbSession) -> PromoBatchResponse:
    return PromoService(db).get_batch(batch_id)


@router.get("/promo/batches/{batch_id}/download")
def download_batch(batch_id: str, db: DbSession) -> Response:
    filename, content = PromoService(db).build_batch_zip(batch_id)
    return Response(
        content,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/gen", response_model=PromoJobResponse)
def create_job_alias(
    payload: PromoJobCreate,
    background_tasks: BackgroundTasks,
    db: DbSession,
) -> PromoJobResponse:
    service = PromoService(db)
    response = service.create_job(payload)
    background_tasks.add_task(service.run_job, response.job_id, payload)
    return response


@router.get("/job", response_model=PromoJobResponse)
def get_job_alias(db: DbSession, job_id: str = Query(alias="id")) -> PromoJobResponse:
    return PromoService(db).get_job(job_id)


@router.post("/gen-batch", response_model=PromoBatchCreateResponse)
def create_batch_alias(
    payload: PromoBatchCreate,
    background_tasks: BackgroundTasks,
    db: DbSession,
) -> PromoBatchCreateResponse:
    service = PromoService(db)
    response = service.create_batch(payload)
    for item in response.jobs:
        video_url = payload.episodes[str(item.ep)]
        background_tasks.add_task(
            service.run_job,
            item.job_id,
            PromoJobCreate(
                video_url=video_url,
                title=payload.title,
                ep=item.ep,
                dur=payload.dur,
                cover_url=payload.cover_url,
            ),
        )
    return response


@router.get("/batch", response_model=PromoBatchResponse)
def get_batch_alias(db: DbSession, batch_id: str = Query(alias="id")) -> PromoBatchResponse:
    return PromoService(db).get_batch(batch_id)


@router.get("/batch-download")
def download_batch_alias(db: DbSession, batch_id: str = Query(alias="id")) -> Response:
    filename, content = PromoService(db).build_batch_zip(batch_id)
    return Response(
        content,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/file")
def get_file_alias(slug: str, n: str, db: DbSession) -> FileResponse:
    path, media_type = PromoService(db).asset_path_by_slug(slug, n)
    return FileResponse(path, media_type=media_type, filename=path.name)

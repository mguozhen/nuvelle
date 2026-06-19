from __future__ import annotations

import uuid
from collections.abc import Callable
from pathlib import Path
from typing import cast

from fastapi import HTTPException
from fastapi.responses import Response
from nuvelle_kit import PromoGenerationRequest, PromoGenerationResult, generate_promo
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models.promo_job import PromoJob, PromoJobStatus
from app.models.user_drama_event import UserDramaEvent
from app.repositories.promo_job_repository import PromoJobRepository
from app.schemas.promo import (
    PromoBatchCreate,
    PromoBatchCreateResponse,
    PromoBatchJob,
    PromoBatchResponse,
    PromoJobCreate,
    PromoJobFiles,
    PromoJobResponse,
)
from app.services.promo_asset_responder import PromoAssetResponder
from app.services.promo_asset_store import PromoAssetStore
from app.services.promo_assets import (
    PROMO_ASSET_NAMES,
    PROMO_COVER_FILE,
    PROMO_TEASER_FILE,
    promo_file_url,
    read_plan_file,
)
from app.services.promo_batch_packager import PromoBatchPackager
from app.services.reelshort_video_service import ReelShortVideoService

PromoGenerator = Callable[[PromoGenerationRequest], PromoGenerationResult]
PROGRESS_BY_STATUS = {
    PromoJobStatus.queued.value: 5,
    PromoJobStatus.downloading.value: 25,
    PromoJobStatus.rendering.value: 70,
    PromoJobStatus.done.value: 100,
    PromoJobStatus.error.value: 100,
}


class PromoService:
    def __init__(
        self,
        db: Session,
        *,
        asset_store: PromoAssetStore | None = None,
        generator: PromoGenerator | None = None,
    ) -> None:
        self.repository = PromoJobRepository(db)
        self.settings = get_settings()
        self.asset_store = asset_store or PromoAssetStore(self.settings)
        self.asset_responder = PromoAssetResponder(self.asset_store)
        self.batch_packager = PromoBatchPackager(self.asset_store)
        self.generator = generator or generate_promo

    def create_job(
        self,
        payload: PromoJobCreate,
        batch_id: str | None = None,
        user_id: int | None = None,
    ) -> PromoJobResponse:
        video_source = payload.video_url or payload.url
        if not video_source:
            raise HTTPException(status_code=400, detail="video_url is required")

        job = self.repository.add(
            PromoJob(
                id=self._new_job_id(),
                batch_id=batch_id,
                user_id=user_id,
                drama_id=payload.drama_id,
                episode_id=payload.episode_id,
                status=PromoJobStatus.queued.value,
                title=payload.title,
                episode=payload.ep,
                duration=payload.dur,
                source_url=video_source,
                prompt=payload.prompt or None,
                cover_url=payload.cover_url or payload.cover_image or None,
                log="queued",
            )
        )
        if user_id is not None and payload.drama_id is not None:
            self._record_generate_event(user_id, payload)
        queued_response = self.to_response(job)
        return queued_response

    def get_job(self, job_id: str) -> PromoJobResponse:
        job = self.repository.get(job_id)
        if job is None:
            raise HTTPException(status_code=404, detail="job not found")
        return self.to_response(job)

    def create_batch(self, payload: PromoBatchCreate) -> PromoBatchCreateResponse:
        if not payload.episodes:
            raise HTTPException(status_code=400, detail="episodes is required")

        batch_id = uuid.uuid4().hex[:12]
        jobs: list[PromoBatchJob] = []
        for episode_key, video_url in sorted(payload.episodes.items(), key=lambda item: int(item[0])):
            job_payload = PromoJobCreate(
                video_url=video_url,
                title=payload.title,
                ep=int(episode_key),
                dur=payload.dur,
                cover_url=payload.cover_url,
            )
            response = self.create_job(job_payload, batch_id=batch_id)
            jobs.append(
                PromoBatchJob(
                    ep=int(episode_key),
                    job_id=response.job_id,
                    status=response.status,
                    files=response.files,
                    caption=response.caption,
                    tt_safe=response.tt_safe,
                    tt_notes=response.tt_notes,
                )
            )
        return PromoBatchCreateResponse(batch_id=batch_id, jobs=jobs)

    def get_batch(self, batch_id: str) -> PromoBatchResponse:
        jobs = self.repository.list_by_batch(batch_id)
        if not jobs:
            raise HTTPException(status_code=404, detail="batch not found")
        items = [self.to_batch_job(job) for job in jobs]
        return PromoBatchResponse(
            batch_id=batch_id,
            title=jobs[0].title,
            total=len(jobs),
            done=sum(1 for job in jobs if job.status == PromoJobStatus.done.value),
            error=sum(1 for job in jobs if job.status == PromoJobStatus.error.value),
            jobs=items,
        )

    def build_batch_zip(self, batch_id: str) -> tuple[str, bytes]:
        jobs = self.repository.list_by_batch(batch_id)
        if not jobs:
            raise HTTPException(status_code=404, detail="batch not found")
        return self.batch_packager.build_zip(title=jobs[0].title, jobs=jobs)

    def asset_response(
        self,
        job_id: str,
        filename: str,
        range_header: str | None = None,
    ) -> Response:
        if filename not in PROMO_ASSET_NAMES:
            raise HTTPException(status_code=404, detail="asset not found")
        job = self.repository.get(job_id)
        if job is None or not job.output_dir:
            raise HTTPException(status_code=404, detail="job not found")
        return self.asset_responder.response_for(job.output_dir, filename, range_header)

    def asset_response_by_slug(
        self,
        slug: str,
        filename: str,
        range_header: str | None = None,
    ) -> Response:
        if filename not in PROMO_ASSET_NAMES:
            raise HTTPException(status_code=404, detail="asset not found")
        return self.asset_responder.response_for(
            self.asset_store.location_for_slug(slug),
            filename,
            range_header,
        )

    def run_job(self, job_id: str, payload: PromoJobCreate) -> PromoJobResponse:
        job = self.repository.get(job_id)
        if job is None:
            raise HTTPException(status_code=404, detail="job not found")

        try:
            job.status = PromoJobStatus.downloading.value
            job.log = "refreshing source video"
            self.repository.update(job)

            beats = self._clean_beats(payload.beats)
            video_source = self._video_source_for(job, payload)
            job.status = PromoJobStatus.rendering.value
            job.log = "rendering"
            self.repository.update(job)
            output_dir = self.asset_store.output_dir_for(job.id)
            result = self.generator(
                PromoGenerationRequest(
                    mp4=cast(Path, video_source),
                    title=payload.title,
                    episode=str(payload.ep),
                    duration=int(payload.dur),
                    beats=beats,
                    cover_ts=beats[0] if beats else None,
                    no_ai=payload.no_ai,
                    prompt=payload.prompt,
                    cover_image_url=payload.cover_url or payload.cover_image,
                    output_dir=output_dir,
                )
            )
            plan = self._read_plan(result.plan_path)
            storage_location = self.asset_store.persist_job_assets(
                job_id=job.id,
                output_dir=result.output_dir,
                asset_names=PROMO_ASSET_NAMES,
            )
            job.status = PromoJobStatus.done.value
            job.output_dir = storage_location
            job.teaser_url = promo_file_url(job.id, PROMO_TEASER_FILE)
            job.cover_url = promo_file_url(job.id, PROMO_COVER_FILE)
            job.caption = result.caption_text
            job.log = "generated by nuvelle_kit package"
            job.tt_safe = bool(plan.get("tt_safe", True))
            job.tt_notes = str(plan.get("tt_notes", ""))
            job.cover_warn = str(plan.get("cover_warn", ""))
            self.repository.update(job)
        except Exception as exc:
            job.status = PromoJobStatus.error.value
            job.error = str(exc)
            job.log = str(exc)
            self.repository.update(job)
        finally:
            if "output_dir" in locals():
                self.asset_store.cleanup_work_dir(output_dir)
        return self.to_response(job)

    @staticmethod
    def run_job_detached(job_id: str, payload: PromoJobCreate) -> None:
        db = SessionLocal()
        try:
            PromoService(db).run_job(job_id, payload)
        finally:
            db.close()

    def to_response(self, job: PromoJob) -> PromoJobResponse:
        return PromoJobResponse(
            id=job.id,
            job_id=job.id,
            status=job.status,
            progress=self.progress_for_status(job.status),
            files=self.files_for(job),
            caption=job.caption,
            title=job.title,
            tt_safe=job.tt_safe,
            tt_notes=job.tt_notes or "",
            cover_warn=job.cover_warn or "",
            log=job.log,
            error=job.error,
        )

    def to_batch_job(self, job: PromoJob) -> PromoBatchJob:
        return PromoBatchJob(
            ep=job.episode,
            job_id=job.id,
            status=job.status,
            files=self.files_for(job),
            caption=job.caption,
            tt_safe=job.tt_safe,
            tt_notes=job.tt_notes or "",
        )

    def files_for(self, job: PromoJob) -> PromoJobFiles | None:
        if job.status != PromoJobStatus.done.value:
            return None
        return PromoJobFiles(
            teaser=promo_file_url(job.id, PROMO_TEASER_FILE),
            cover=promo_file_url(job.id, PROMO_COVER_FILE),
        )

    @staticmethod
    def _new_job_id() -> str:
        return uuid.uuid4().hex[:10]

    @staticmethod
    def progress_for_status(status: str | None) -> int:
        return PROGRESS_BY_STATUS.get(status or "", 0)

    @staticmethod
    def _clean_beats(beats: list[float] | None) -> list[float] | None:
        if not beats:
            return None
        cleaned = [round(float(beat), 1) for beat in beats if float(beat) > 0.3]
        return cleaned or None

    @staticmethod
    def _read_plan(path: Path) -> dict[str, object]:
        return read_plan_file(path)

    def _record_generate_event(self, user_id: int, payload: PromoJobCreate) -> None:
        if payload.drama_id is None:
            return
        stmt = select(UserDramaEvent).where(
            UserDramaEvent.user_id == user_id,
            UserDramaEvent.drama_id == payload.drama_id,
            UserDramaEvent.event_type == "generate",
        )
        event = self.repository.db.scalars(stmt).first()
        if event is None:
            event = UserDramaEvent(
                user_id=user_id,
                drama_id=payload.drama_id,
                event_type="generate",
            )
        event.episode_id = payload.episode_id
        event.event_metadata = {"prompt": payload.prompt, "duration": payload.dur}
        self.repository.db.add(event)
        self.repository.db.commit()

    def _video_source_for(self, job: PromoJob, payload: PromoJobCreate) -> str:
        refreshed = ReelShortVideoService(self.repository.db).refresh_episode_play_url(
            drama_id=payload.drama_id,
            episode_id=payload.episode_id,
        )
        video_source = refreshed or payload.video_url or payload.url
        if not video_source:
            raise HTTPException(status_code=400, detail="video_url is required")
        job.source_url = video_source
        self.repository.update(job)
        return video_source

from __future__ import annotations

import io
import json
import mimetypes
import uuid
import zipfile
from pathlib import Path
from typing import cast

from fastapi import HTTPException
from nuvelle_kit import PromoGenerationRequest, generate_promo
from nuvelle_kit.storage import slugify
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.promo_job import PromoJob, PromoJobStatus
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

ASSET_NAMES = {"teaser.mp4", "cover.jpg", "caption.txt", "plan.json"}


class PromoService:
    def __init__(self, db: Session) -> None:
        self.repository = PromoJobRepository(db)
        self.settings = get_settings()

    def create_job(self, payload: PromoJobCreate, batch_id: str | None = None) -> PromoJobResponse:
        video_source = payload.video_url or payload.url
        if not video_source:
            raise HTTPException(status_code=400, detail="video_url is required")

        job = self.repository.add(
            PromoJob(
                id=self._new_job_id(),
                batch_id=batch_id,
                status=PromoJobStatus.queued.value,
                title=payload.title,
                episode=payload.ep,
                duration=payload.dur,
                source_url=video_source,
                cover_url=payload.cover_url or payload.cover_image or None,
                log="queued",
            )
        )
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
        batch = self.get_batch(batch_id)
        buf = io.BytesIO()
        prefix = slugify(batch.title)
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            summary_lines = [f"{batch.title} - TikTok promo pack\n{'=' * 50}\n"]
            for item in sorted(batch.jobs, key=lambda value: value.ep):
                job = self.repository.get(item.job_id)
                if job is None or job.status != PromoJobStatus.done.value or not job.output_dir:
                    continue
                output_dir = Path(job.output_dir)
                teaser = output_dir / "teaser.mp4"
                if teaser.exists():
                    zf.write(teaser, f"{prefix}_EP{item.ep}.mp4")
                caption = (output_dir / "caption.txt").read_text(encoding="utf-8").strip()
                plan = self._read_plan(output_dir / "plan.json")
                hook_value = plan.get("hook", [])
                hook = " / ".join(str(part) for part in hook_value) if isinstance(hook_value, list) else ""
                logline = plan.get("logline", "")
                summary_lines.extend(
                    [
                        f"\nEP{item.ep}\n{'-' * 30}",
                        f"Title: {hook}",
                        f"Logline: {logline}",
                        f"TikTok safe: {'yes' if item.tt_safe else 'review - ' + item.tt_notes}",
                        f"Caption:\n{caption}\n",
                    ]
                )
            zf.writestr(f"{prefix}_summary.txt", "\n".join(summary_lines))
        return f"{prefix}_promo_pack.zip", buf.getvalue()

    def asset_path(self, job_id: str, filename: str) -> tuple[Path, str]:
        if filename not in ASSET_NAMES:
            raise HTTPException(status_code=404, detail="asset not found")
        job = self.repository.get(job_id)
        if job is None or not job.output_dir:
            raise HTTPException(status_code=404, detail="job not found")
        path = Path(job.output_dir) / filename
        if not path.exists():
            raise HTTPException(status_code=404, detail="asset not found")
        return path, mimetypes.guess_type(path.name)[0] or "application/octet-stream"

    def asset_path_by_slug(self, slug: str, filename: str) -> tuple[Path, str]:
        if filename not in ASSET_NAMES:
            raise HTTPException(status_code=404, detail="asset not found")
        path = Path(self.settings.promo_storage_dir).resolve() / Path(slug).name / filename
        if not path.exists():
            raise HTTPException(status_code=404, detail="asset not found")
        return path, mimetypes.guess_type(path.name)[0] or "application/octet-stream"

    def run_job(self, job_id: str, payload: PromoJobCreate) -> None:
        job = self.repository.get(job_id)
        if job is None:
            raise HTTPException(status_code=404, detail="job not found")

        try:
            job.status = PromoJobStatus.rendering.value
            job.log = "rendering"
            self.repository.update(job)

            beats = self._clean_beats(payload.beats)
            result = generate_promo(
                PromoGenerationRequest(
                    mp4=cast(Path, payload.video_url or payload.url or ""),
                    title=payload.title,
                    episode=str(payload.ep),
                    duration=int(payload.dur),
                    beats=beats,
                    cover_ts=beats[0] if beats else None,
                    no_ai=payload.no_ai,
                    prompt=payload.prompt,
                    cover_image_url=payload.cover_url or payload.cover_image,
                )
            )
            plan = self._read_plan(result.plan_path)
            job.status = PromoJobStatus.done.value
            job.output_dir = str(result.output_dir)
            job.teaser_url = self.file_url(job.id, "teaser.mp4")
            job.cover_url = self.file_url(job.id, "cover.jpg")
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

    def to_response(self, job: PromoJob) -> PromoJobResponse:
        return PromoJobResponse(
            id=job.id,
            job_id=job.id,
            status=job.status,
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
            teaser=self.file_url(job.id, "teaser.mp4"),
            cover=self.file_url(job.id, "cover.jpg"),
        )

    @staticmethod
    def file_url(job_id: str, filename: str) -> str:
        return f"/promo/jobs/{job_id}/files/{filename}"

    @staticmethod
    def _new_job_id() -> str:
        return uuid.uuid4().hex[:10]

    @staticmethod
    def _clean_beats(beats: list[float] | None) -> list[float] | None:
        if not beats:
            return None
        cleaned = [round(float(beat), 1) for beat in beats if float(beat) > 0.3]
        return cleaned or None

    @staticmethod
    def _read_plan(path: Path) -> dict[str, object]:
        if not path.exists():
            return {}
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return {}
        return cast(dict[str, object], data) if isinstance(data, dict) else {}

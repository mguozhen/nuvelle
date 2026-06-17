from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.admin_user import AdminUser
from app.models.drama import Drama, DramaEpisode
from app.models.promo_job import PromoJob, PromoJobStatus
from app.schemas.admin import (
    GeneratedDramaRef,
    GeneratedEpisodeRef,
    GeneratedFiles,
    GeneratedJobRead,
    GeneratedListResponse,
)


class GeneratedService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_jobs(
        self,
        user: AdminUser,
        *,
        status: str | None,
        q: str | None,
        limit: int,
        offset: int,
    ) -> GeneratedListResponse:
        stmt = select(PromoJob).where(PromoJob.user_id == user.id)
        if status:
            stmt = stmt.where(PromoJob.status == status)
        stmt = stmt.order_by(PromoJob.created_at.desc(), PromoJob.id.desc())
        jobs = list(self.db.scalars(stmt).all())
        filtered = [job for job in jobs if self._matches(job, q)]
        page = filtered[offset : offset + limit]
        return GeneratedListResponse(items=[self.to_read(job) for job in page], total=len(filtered))

    def get_job(self, user: AdminUser, job_id: str) -> GeneratedJobRead:
        job = self.db.get(PromoJob, job_id)
        if job is None or (job.user_id != user.id and user.role != "admin"):
            raise HTTPException(status_code=404, detail="generated job not found")
        return self.to_read(job)

    def to_read(self, job: PromoJob) -> GeneratedJobRead:
        drama = self.db.get(Drama, job.drama_id) if job.drama_id else None
        episode = self.db.get(DramaEpisode, job.episode_id) if job.episode_id else None
        files = None
        if job.status == PromoJobStatus.done.value:
            files = GeneratedFiles(teaser=job.teaser_url, cover=job.cover_url)
        return GeneratedJobRead(
            id=job.id,
            job_id=job.id,
            status=job.status,
            title=job.title,
            episode=job.episode,
            duration=job.duration,
            source_url=job.source_url,
            prompt=job.prompt,
            caption=job.caption,
            error=job.error,
            files=files,
            drama=GeneratedDramaRef(id=drama.id, title=drama.title) if drama else None,
            episode_ref=(
                GeneratedEpisodeRef(id=episode.id, episode_no=episode.episode_no)
                if episode
                else None
            ),
            created_at=job.created_at,
        )

    def _matches(self, job: PromoJob, q: str | None) -> bool:
        if not q:
            return True
        needle = q.lower()
        if needle in (job.title or "").lower() or needle in (job.prompt or "").lower():
            return True
        if job.drama_id:
            drama = self.db.get(Drama, job.drama_id)
            return bool(drama and needle in drama.title.lower())
        return False

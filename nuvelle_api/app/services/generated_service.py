from fastapi import HTTPException
from sqlalchemy import func, or_, select
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
        if q:
            pattern = f"%{q.lower()}%"
            stmt = stmt.outerjoin(Drama, PromoJob.drama_id == Drama.id).where(
                or_(
                    func.lower(PromoJob.title).like(pattern),
                    func.lower(PromoJob.prompt).like(pattern),
                    func.lower(Drama.title).like(pattern),
                )
            )

        total = self.db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
        page = list(
            self.db.scalars(
                stmt.order_by(PromoJob.created_at.desc(), PromoJob.id.desc()).limit(limit).offset(offset)
            ).all()
        )
        dramas, episodes = self._refs_for(page)
        return GeneratedListResponse(
            items=[self.to_read(job, dramas=dramas, episodes=episodes) for job in page],
            total=total,
        )

    def get_job(self, user: AdminUser, job_id: str) -> GeneratedJobRead:
        job = self.db.get(PromoJob, job_id)
        if job is None or (job.user_id != user.id and user.role != "admin"):
            raise HTTPException(status_code=404, detail="generated job not found")
        dramas, episodes = self._refs_for([job])
        return self.to_read(job, dramas=dramas, episodes=episodes)

    def to_read(
        self,
        job: PromoJob,
        *,
        dramas: dict[int, Drama] | None = None,
        episodes: dict[int, DramaEpisode] | None = None,
    ) -> GeneratedJobRead:
        drama = dramas.get(job.drama_id) if dramas and job.drama_id else None
        episode = episodes.get(job.episode_id) if episodes and job.episode_id else None
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

    def _refs_for(self, jobs: list[PromoJob]) -> tuple[dict[int, Drama], dict[int, DramaEpisode]]:
        drama_ids = {job.drama_id for job in jobs if job.drama_id is not None}
        episode_ids = {job.episode_id for job in jobs if job.episode_id is not None}
        dramas = {
            drama.id: drama
            for drama in self.db.scalars(select(Drama).where(Drama.id.in_(drama_ids))).all()
        } if drama_ids else {}
        episodes = {
            episode.id: episode
            for episode in self.db.scalars(select(DramaEpisode).where(DramaEpisode.id.in_(episode_ids))).all()
        } if episode_ids else {}
        return dramas, episodes

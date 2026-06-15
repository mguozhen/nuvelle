from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.promo_job import PromoJob


class PromoJobRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def add(self, job: PromoJob) -> PromoJob:
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)
        return job

    def get(self, job_id: str) -> PromoJob | None:
        return self.db.get(PromoJob, job_id)

    def list_by_batch(self, batch_id: str) -> list[PromoJob]:
        stmt = select(PromoJob).where(PromoJob.batch_id == batch_id).order_by(PromoJob.episode.asc())
        return list(self.db.scalars(stmt).all())

    def update(self, job: PromoJob) -> PromoJob:
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)
        return job

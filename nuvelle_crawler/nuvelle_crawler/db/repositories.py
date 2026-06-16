from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from nuvelle_crawler.db.models import ThirdPartyCrawlLog, ThirdPartyDramaResource


@dataclass(frozen=True)
class ThirdPartyDramaResourcePayload:
    source: str
    external_id: str
    source_app: str
    book_type: str
    language: str
    title: str
    cover_url: str | None
    synopsis: str | None
    release_date: str | None
    episode_count: int | None
    free_episode_count: int | None
    raw_data: dict
    raw_hash: str


class ThirdPartyDramaRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def upsert(
        self,
        payload: ThirdPartyDramaResourcePayload,
        *,
        seen_at: datetime | None = None,
    ) -> ThirdPartyDramaResource:
        seen_at = seen_at or datetime.now(UTC)
        resource = self.find_existing(payload)
        if resource is None:
            resource = ThirdPartyDramaResource(
                source=payload.source,
                external_id=payload.external_id,
                source_app=payload.source_app,
                book_type=payload.book_type,
                language=payload.language,
                title=payload.title,
                cover_url=payload.cover_url,
                synopsis=payload.synopsis,
                release_date=payload.release_date,
                episode_count=payload.episode_count,
                free_episode_count=payload.free_episode_count,
                import_status="pending",
                raw_data=payload.raw_data,
                raw_hash=payload.raw_hash,
                first_seen_at=seen_at,
                last_seen_at=seen_at,
                last_changed_at=seen_at,
            )
            self.db.add(resource)
            self.db.flush()
            return resource

        resource.last_seen_at = seen_at
        if resource.raw_hash != payload.raw_hash:
            resource.title = payload.title
            resource.cover_url = payload.cover_url
            resource.synopsis = payload.synopsis
            resource.release_date = payload.release_date
            resource.episode_count = payload.episode_count
            resource.free_episode_count = payload.free_episode_count
            resource.raw_data = payload.raw_data
            resource.raw_hash = payload.raw_hash
            resource.last_changed_at = seen_at
        self.db.flush()
        return resource

    def find_existing(
        self,
        payload: ThirdPartyDramaResourcePayload,
    ) -> ThirdPartyDramaResource | None:
        statement = select(ThirdPartyDramaResource).where(
            ThirdPartyDramaResource.source == payload.source,
            ThirdPartyDramaResource.external_id == payload.external_id,
            ThirdPartyDramaResource.source_app == payload.source_app,
            ThirdPartyDramaResource.book_type == payload.book_type,
            ThirdPartyDramaResource.language == payload.language,
        )
        return self.db.scalar(statement)


class ThirdPartyCrawlLogRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(
        self,
        *,
        source: str,
        run_type: str,
        status: str,
        started_at: datetime | None = None,
        finished_at: datetime | None = None,
        scanned_count: int = 0,
        changed_count: int = 0,
        error_count: int = 0,
        message: str | None = None,
        metadata: dict | None = None,
    ) -> ThirdPartyCrawlLog:
        log = ThirdPartyCrawlLog(
            source=source,
            run_type=run_type,
            status=status,
            started_at=started_at,
            finished_at=finished_at,
            scanned_count=scanned_count,
            changed_count=changed_count,
            error_count=error_count,
            message=message,
            log_metadata=metadata,
        )
        self.db.add(log)
        self.db.flush()
        return log

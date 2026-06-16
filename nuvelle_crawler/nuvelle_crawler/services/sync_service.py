from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from nuvelle_crawler.db.repositories import ThirdPartyCrawlLogRepository, ThirdPartyDramaRepository
from nuvelle_crawler.services.planner import CrawlerPlanner
from nuvelle_crawler.sources.base import DramaSourceAdapter


@dataclass(frozen=True)
class SyncSummary:
    scanned_count: int
    changed_count: int
    enqueued_count: int = 0


class ThirdPartyDramaSyncService:
    def __init__(
        self,
        *,
        db: Session,
        adapter: DramaSourceAdapter,
        planner: CrawlerPlanner,
    ) -> None:
        self.db = db
        self.adapter = adapter
        self.planner = planner
        self.resources = ThirdPartyDramaRepository(db)
        self.logs = ThirdPartyCrawlLogRepository(db)

    def sync_list_page(self, *, source: str, page: int, language: str | None, sort: str) -> SyncSummary:
        started_at = datetime.now(UTC)
        rows = self.adapter.list_page(page=page, language=language, sort=sort)
        changed_count = 0
        enqueued_count = 0
        for row in rows:
            payload = self.adapter.to_resource_payload(row)
            existing = self.resources.find_existing(payload)
            existing_hash = existing.raw_hash if existing else None
            resource = self.resources.upsert(payload)
            if existing_hash != resource.raw_hash:
                changed_count += 1
            self.planner.enqueue_detail(
                source=source,
                external_id=payload.external_id,
                book_type=payload.book_type,
            )
            enqueued_count += 1
        self.logs.create(
            source=source,
            run_type="list_page",
            status="success",
            started_at=started_at,
            finished_at=datetime.now(UTC),
            scanned_count=len(rows),
            changed_count=changed_count,
            metadata={"page": page, "language": language, "sort": sort},
        )
        return SyncSummary(
            scanned_count=len(rows),
            changed_count=changed_count,
            enqueued_count=enqueued_count,
        )

    def sync_detail(self, *, source: str, external_id: str, book_type: str) -> SyncSummary:
        started_at = datetime.now(UTC)
        raw = self.adapter.get_detail(external_id=external_id, book_type=book_type)
        payload = self.adapter.to_resource_payload(raw)
        existing = self.resources.find_existing(payload)
        existing_hash = existing.raw_hash if existing else None
        resource = self.resources.upsert(payload)
        changed_count = 1 if existing_hash != resource.raw_hash else 0
        self.logs.create(
            source=source,
            run_type="detail",
            status="success",
            started_at=started_at,
            finished_at=datetime.now(UTC),
            scanned_count=1,
            changed_count=changed_count,
            metadata={"external_id": external_id, "book_type": book_type},
        )
        return SyncSummary(scanned_count=1, changed_count=changed_count)

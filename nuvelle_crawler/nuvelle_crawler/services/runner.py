from collections.abc import Callable
from dataclasses import asdict, dataclass, field
from time import sleep as default_sleep

from sqlalchemy.orm import Session

from nuvelle_crawler.services.backfill import (
    DEFAULT_REQUEST_DELAY_SECONDS,
    LocalBackfillSummary,
    LocalDramaBackfillService,
)
from nuvelle_crawler.services.compensation import (
    FailedCrawlCompensationService,
    FailureCompensationSummary,
)
from nuvelle_crawler.sources.base import DramaSourceAdapter


@dataclass(frozen=True)
class ManagedCrawlerRunSummary:
    backfill: LocalBackfillSummary
    compensations: list[FailureCompensationSummary] = field(default_factory=list)

    @property
    def remaining_error_count(self) -> int:
        if self.compensations:
            return self.compensations[-1].error_count
        return self.backfill.failure_count

    @property
    def ok(self) -> bool:
        return self.remaining_error_count == 0

    def to_dict(self) -> dict:
        data = asdict(self)
        data["ok"] = self.ok
        data["remaining_error_count"] = self.remaining_error_count
        return data


class ManagedCrawlerRunService:
    def __init__(
        self,
        *,
        db: Session,
        adapter: DramaSourceAdapter,
        sleep: Callable[[float], None] = default_sleep,
        reporter: Callable[[str], None] | None = None,
    ) -> None:
        self.db = db
        self.adapter = adapter
        self.sleep = sleep
        self.reporter = reporter

    def run(
        self,
        *,
        source: str,
        languages: list[str | None],
        sorts: list[str],
        max_pages: int | None,
        start_page: int = 1,
        delay_seconds: float = DEFAULT_REQUEST_DELAY_SECONDS,
        with_details: bool = True,
        list_retry_attempts: int = 2,
        detail_retry_attempts: int = 2,
        compensation_rounds: int = 2,
        compensation_delay_seconds: float | None = None,
        compensation_detail_retry_attempts: int = 5,
    ) -> ManagedCrawlerRunSummary:
        if compensation_rounds < 0:
            raise ValueError("compensation_rounds must be >= 0")

        backfill = LocalDramaBackfillService(
            db=self.db,
            adapter=self.adapter,
            sleep=self.sleep,
            reporter=self.reporter,
        ).run(
            source=source,
            languages=languages,
            sorts=sorts,
            max_pages=max_pages,
            start_page=start_page,
            delay_seconds=delay_seconds,
            with_details=with_details,
            list_retry_attempts=list_retry_attempts,
            detail_retry_attempts=detail_retry_attempts,
            continue_on_detail_error=True,
        )

        compensations: list[FailureCompensationSummary] = []
        crawl_log_ids = [backfill.crawl_log_id] if backfill.crawl_log_id else None
        compensation_delay = delay_seconds if compensation_delay_seconds is None else compensation_delay_seconds

        for round_index in range(compensation_rounds):
            if not crawl_log_ids or self._last_failure_count(backfill, compensations) == 0:
                break
            self._report(f"managed compensation round={round_index + 1}/{compensation_rounds}")
            compensation = FailedCrawlCompensationService(
                db=self.db,
                adapter=self.adapter,
                sleep=self.sleep,
                reporter=self.reporter,
            ).run(
                source=source,
                crawl_log_ids=crawl_log_ids,
                delay_seconds=compensation_delay,
                with_details=with_details,
                list_retry_attempts=list_retry_attempts,
                detail_retry_attempts=compensation_detail_retry_attempts,
            )
            compensations.append(compensation)
            crawl_log_ids = [compensation.crawl_log_id] if compensation.crawl_log_id else None

        return ManagedCrawlerRunSummary(backfill=backfill, compensations=compensations)

    @staticmethod
    def _last_failure_count(
        backfill: LocalBackfillSummary,
        compensations: list[FailureCompensationSummary],
    ) -> int:
        if compensations:
            return compensations[-1].error_count
        return backfill.failure_count

    def _report(self, message: str) -> None:
        if self.reporter:
            self.reporter(message)

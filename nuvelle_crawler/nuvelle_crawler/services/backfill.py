from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime
from time import sleep as default_sleep

from sqlalchemy.orm import Session

from nuvelle_crawler.db.repositories import (
    ThirdPartyCrawlLogRepository,
    ThirdPartyDramaRepository,
    ThirdPartyDramaResourcePayload,
)
from nuvelle_crawler.sources.base import DramaSourceAdapter


@dataclass(frozen=True)
class LocalBackfillSummary:
    list_pages_scanned: int = 0
    resources_scanned: int = 0
    resources_changed: int = 0
    details_scanned: int = 0
    details_changed: int = 0
    detail_errors: int = 0


class LocalDramaBackfillService:
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
        self.resources = ThirdPartyDramaRepository(db)
        self.logs = ThirdPartyCrawlLogRepository(db)

    def run(
        self,
        *,
        source: str,
        languages: list[str | None],
        sorts: list[str],
        max_pages: int | None,
        delay_seconds: float = 3.0,
        with_details: bool = False,
        continue_on_detail_error: bool = True,
    ) -> LocalBackfillSummary:
        if max_pages is not None and max_pages < 1:
            raise ValueError("max_pages must be >= 1")
        if delay_seconds < 0:
            raise ValueError("delay_seconds must be >= 0")

        started_at = datetime.now(UTC)
        list_pages_scanned = 0
        resources_scanned = 0
        resources_changed = 0
        details_scanned = 0
        details_changed = 0
        detail_errors = 0
        self._report(
            "start "
            f"source={source} languages={','.join(str(language) for language in languages)} "
            f"sorts={','.join(sorts)} max_pages={max_pages or 'none'} "
            f"with_details={with_details} delay_seconds={delay_seconds}"
        )

        try:
            for language in languages:
                for sort in sorts:
                    page = 1
                    while max_pages is None or page <= max_pages:
                        self._pause(delay_seconds, list_pages_scanned + details_scanned)
                        self._report(
                            f"list start source={source} language={language or '-'} sort={sort} page={page}"
                        )
                        rows = self.adapter.list_page(page=page, language=language, sort=sort)
                        list_pages_scanned += 1
                        if not rows:
                            self._report(
                                f"list empty source={source} language={language or '-'} "
                                f"sort={sort} page={page}"
                            )
                            self.db.commit()
                            break

                        page_changed = 0
                        for row in rows:
                            changed, payload = self._upsert_raw(row)
                            page_changed += changed
                            if with_details:
                                self._pause(delay_seconds, list_pages_scanned + details_scanned)
                                self._report(
                                    "detail start "
                                    f"external_id={payload.external_id} book_type={payload.book_type}"
                                )
                                try:
                                    detail_raw = self.adapter.get_detail(
                                        external_id=payload.external_id,
                                        book_type=payload.book_type,
                                    )
                                    detail_changed, _ = self._upsert_raw(self._merge_detail(row, detail_raw))
                                    details_scanned += 1
                                    details_changed += detail_changed
                                    self._report(
                                        "detail done "
                                        f"external_id={payload.external_id} changed={detail_changed}"
                                    )
                                except Exception as exc:
                                    detail_errors += 1
                                    self._report(
                                        "detail error "
                                        f"external_id={payload.external_id} "
                                        f"book_type={payload.book_type} error={exc}"
                                    )
                                    if not continue_on_detail_error:
                                        raise

                        resources_scanned += len(rows)
                        resources_changed += page_changed
                        self.db.commit()
                        self._report(
                            f"list done source={source} language={language or '-'} sort={sort} "
                            f"page={page} rows={len(rows)} changed={page_changed}"
                        )
                        page += 1

            summary = LocalBackfillSummary(
                list_pages_scanned=list_pages_scanned,
                resources_scanned=resources_scanned,
                resources_changed=resources_changed,
                details_scanned=details_scanned,
                details_changed=details_changed,
                detail_errors=detail_errors,
            )
            self.logs.create(
                source=source,
                run_type="local_backfill",
                status="success",
                started_at=started_at,
                finished_at=datetime.now(UTC),
                scanned_count=summary.resources_scanned,
                changed_count=summary.resources_changed + summary.details_changed,
                error_count=summary.detail_errors,
                metadata={
                    "languages": languages,
                    "sorts": sorts,
                    "max_pages": max_pages,
                    "with_details": with_details,
                    "continue_on_detail_error": continue_on_detail_error,
                    "list_pages_scanned": summary.list_pages_scanned,
                    "details_scanned": summary.details_scanned,
                    "detail_errors": summary.detail_errors,
                },
            )
            self.db.commit()
            self._report(
                "done "
                f"resources_scanned={summary.resources_scanned} "
                f"details_scanned={summary.details_scanned} "
                f"detail_errors={summary.detail_errors}"
            )
            return summary
        except Exception as exc:
            self.db.rollback()
            self.logs.create(
                source=source,
                run_type="local_backfill",
                status="error",
                started_at=started_at,
                finished_at=datetime.now(UTC),
                scanned_count=resources_scanned,
                changed_count=resources_changed + details_changed,
                error_count=detail_errors + 1,
                message=str(exc),
                metadata={
                    "languages": languages,
                    "sorts": sorts,
                    "max_pages": max_pages,
                    "with_details": with_details,
                    "continue_on_detail_error": continue_on_detail_error,
                    "list_pages_scanned": list_pages_scanned,
                    "details_scanned": details_scanned,
                    "detail_errors": detail_errors,
                },
            )
            self.db.commit()
            raise

    def _upsert_raw(self, raw: dict) -> tuple[int, ThirdPartyDramaResourcePayload]:
        payload = self.adapter.to_resource_payload(raw)
        existing = self.resources.find_existing(payload)
        existing_hash = existing.raw_hash if existing else None
        resource = self.resources.upsert(payload)
        return int(existing_hash != resource.raw_hash), payload

    @staticmethod
    def _merge_detail(list_row: dict, detail_raw: dict) -> dict:
        non_null_detail = {key: value for key, value in detail_raw.items() if value is not None}
        return {**list_row, **non_null_detail}

    def _pause(self, delay_seconds: float, completed_request_count: int) -> None:
        if delay_seconds and completed_request_count:
            self.sleep(delay_seconds)

    def _report(self, message: str) -> None:
        if self.reporter:
            self.reporter(message)

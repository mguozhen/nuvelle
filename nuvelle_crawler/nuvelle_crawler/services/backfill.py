from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime
from time import sleep as default_sleep

from sqlalchemy.orm import Session

from nuvelle_crawler.db.repositories import (
    ThirdPartyCrawlLogRepository,
    ThirdPartyDramaRepository,
    ThirdPartyDramaResourcePayload,
)
from nuvelle_crawler.sources.base import DramaSourceAdapter

SOURCE_PROTECTION_STATUS_CODES = {401, 403, 429, 503}


class SourceProtectionDetectedError(RuntimeError):
    pass


@dataclass(frozen=True)
class LocalBackfillSummary:
    list_pages_scanned: int = 0
    resources_scanned: int = 0
    resources_changed: int = 0
    details_scanned: int = 0
    details_changed: int = 0
    detail_errors: int = 0
    failed_list_pages: list[dict] = field(default_factory=list)
    failed_details: list[dict] = field(default_factory=list)


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
        start_page: int = 1,
        delay_seconds: float = 3.0,
        with_details: bool = False,
        continue_on_detail_error: bool = True,
        list_retry_attempts: int = 2,
        detail_retry_attempts: int = 2,
    ) -> LocalBackfillSummary:
        if start_page < 1:
            raise ValueError("start_page must be >= 1")
        if max_pages is not None and max_pages < 1:
            raise ValueError("max_pages must be >= 1")
        if delay_seconds < 0:
            raise ValueError("delay_seconds must be >= 0")
        if list_retry_attempts < 0:
            raise ValueError("list_retry_attempts must be >= 0")
        if detail_retry_attempts < 0:
            raise ValueError("detail_retry_attempts must be >= 0")

        started_at = datetime.now(UTC)
        list_pages_scanned = 0
        resources_scanned = 0
        resources_changed = 0
        details_scanned = 0
        details_changed = 0
        detail_errors = 0
        failed_list_pages: list[dict] = []
        failed_details: list[dict] = []
        fatal_error_already_counted = False
        self._report(
            "start "
            f"source={source} languages={','.join(str(language) for language in languages)} "
            f"sorts={','.join(sorts)} start_page={start_page} max_pages={max_pages or 'none'} "
            f"with_details={with_details} delay_seconds={delay_seconds} "
            f"list_retry_attempts={list_retry_attempts} "
            f"detail_retry_attempts={detail_retry_attempts}"
        )

        try:
            for language in languages:
                for sort in sorts:
                    page = start_page
                    pages_scanned_for_slice = 0
                    while max_pages is None or pages_scanned_for_slice < max_pages:
                        self._pause(delay_seconds, list_pages_scanned + details_scanned)
                        self._report(
                            f"list start source={source} language={language or '-'} sort={sort} page={page}"
                        )
                        try:
                            rows = self._get_list_page_with_retries(
                                page=page,
                                language=language,
                                sort=sort,
                                retry_attempts=list_retry_attempts,
                                delay_seconds=delay_seconds,
                            )
                        except SourceProtectionDetectedError as exc:
                            failed_list_pages.append(
                                self._list_failure(
                                    language=language,
                                    sort=sort,
                                    page=page,
                                    exc=exc.__cause__ or exc,
                                )
                            )
                            raise
                        except Exception as exc:
                            failed_list_pages.append(
                                self._list_failure(language=language, sort=sort, page=page, exc=exc)
                            )
                            raise
                        list_pages_scanned += 1
                        pages_scanned_for_slice += 1
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
                                    detail_raw = self._get_detail_with_retries(
                                        external_id=payload.external_id,
                                        book_type=payload.book_type,
                                        retry_attempts=detail_retry_attempts,
                                        delay_seconds=delay_seconds,
                                    )
                                    detail_changed, _ = self._upsert_raw(self._merge_detail(row, detail_raw))
                                    details_scanned += 1
                                    details_changed += detail_changed
                                    self._report(
                                        "detail done "
                                        f"external_id={payload.external_id} changed={detail_changed}"
                                    )
                                except SourceProtectionDetectedError as exc:
                                    detail_errors += 1
                                    fatal_error_already_counted = True
                                    failed_details.append(self._detail_failure(payload, exc.__cause__ or exc))
                                    self._report(
                                        "detail protected "
                                        f"external_id={payload.external_id} "
                                        f"book_type={payload.book_type} error={exc}"
                                    )
                                    raise
                                except Exception as exc:
                                    detail_errors += 1
                                    failed_details.append(self._detail_failure(payload, exc))
                                    self._report(
                                        "detail error "
                                        f"external_id={payload.external_id} "
                                        f"book_type={payload.book_type} error={exc}"
                                    )
                                    if not continue_on_detail_error:
                                        fatal_error_already_counted = True
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
                failed_list_pages=failed_list_pages,
                failed_details=failed_details,
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
                    "start_page": start_page,
                    "max_pages": max_pages,
                    "with_details": with_details,
                    "continue_on_detail_error": continue_on_detail_error,
                    "list_retry_attempts": list_retry_attempts,
                    "detail_retry_attempts": detail_retry_attempts,
                    "list_pages_scanned": summary.list_pages_scanned,
                    "details_scanned": summary.details_scanned,
                    "detail_errors": summary.detail_errors,
                    "failed_list_pages": summary.failed_list_pages,
                    "failed_details": summary.failed_details,
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
            error_count = detail_errors if fatal_error_already_counted else detail_errors + 1
            self.logs.create(
                source=source,
                run_type="local_backfill",
                status="error",
                started_at=started_at,
                finished_at=datetime.now(UTC),
                scanned_count=resources_scanned,
                changed_count=resources_changed + details_changed,
                error_count=error_count,
                message=str(exc),
                metadata={
                    "languages": languages,
                    "sorts": sorts,
                    "start_page": start_page,
                    "max_pages": max_pages,
                    "with_details": with_details,
                    "continue_on_detail_error": continue_on_detail_error,
                    "list_retry_attempts": list_retry_attempts,
                    "detail_retry_attempts": detail_retry_attempts,
                    "list_pages_scanned": list_pages_scanned,
                    "details_scanned": details_scanned,
                    "detail_errors": detail_errors,
                    "failed_list_pages": failed_list_pages,
                    "failed_details": failed_details,
                    "source_protection_detected": isinstance(exc, SourceProtectionDetectedError),
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

    def _get_list_page_with_retries(
        self,
        *,
        page: int,
        language: str | None,
        sort: str,
        retry_attempts: int,
        delay_seconds: float,
    ) -> list[dict]:
        failed_attempts = 0
        while True:
            try:
                return self.adapter.list_page(page=page, language=language, sort=sort)
            except Exception as exc:
                if self._is_source_protection_error(exc):
                    status_code = self._status_code(exc)
                    raise SourceProtectionDetectedError(
                        f"source protection detected status_code={status_code} error={exc}"
                    ) from exc
                if failed_attempts >= retry_attempts:
                    raise
                failed_attempts += 1
                self._report(
                    "list retry "
                    f"language={language or '-'} sort={sort} page={page} "
                    f"attempt={failed_attempts}/{retry_attempts} error={exc}"
                )
                if delay_seconds:
                    self.sleep(delay_seconds)

    def _get_detail_with_retries(
        self,
        *,
        external_id: str,
        book_type: str,
        retry_attempts: int,
        delay_seconds: float,
    ) -> dict:
        failed_attempts = 0
        while True:
            try:
                return self.adapter.get_detail(external_id=external_id, book_type=book_type)
            except Exception as exc:
                if self._is_source_protection_error(exc):
                    status_code = self._status_code(exc)
                    raise SourceProtectionDetectedError(
                        f"source protection detected status_code={status_code} error={exc}"
                    ) from exc
                if failed_attempts >= retry_attempts:
                    raise
                failed_attempts += 1
                self._report(
                    "detail retry "
                    f"external_id={external_id} book_type={book_type} "
                    f"attempt={failed_attempts}/{retry_attempts} error={exc}"
                )
                if delay_seconds:
                    self.sleep(delay_seconds)

    @classmethod
    def _is_source_protection_error(cls, exc: Exception) -> bool:
        status_code = cls._status_code(exc)
        return status_code in SOURCE_PROTECTION_STATUS_CODES

    @staticmethod
    def _status_code(exc: Exception) -> int | None:
        response = getattr(exc, "response", None)
        status_code = getattr(response, "status_code", None)
        return status_code if isinstance(status_code, int) else None

    @classmethod
    def _detail_failure(cls, payload: ThirdPartyDramaResourcePayload, exc: Exception) -> dict:
        failure = {
            "external_id": payload.external_id,
            "book_type": payload.book_type,
            "error": str(exc),
            "language": payload.language,
            "source_app": payload.source_app,
            "title": payload.title,
        }
        status_code = cls._status_code(exc)
        if status_code is not None:
            failure["status_code"] = status_code
        return failure

    @classmethod
    def _list_failure(cls, *, language: str | None, sort: str, page: int, exc: Exception) -> dict:
        failure = {
            "language": language,
            "sort": sort,
            "page": page,
            "error": str(exc),
        }
        status_code = cls._status_code(exc)
        if status_code is not None:
            failure["status_code"] = status_code
        return failure

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

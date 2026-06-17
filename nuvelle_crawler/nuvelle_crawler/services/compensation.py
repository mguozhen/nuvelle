from collections.abc import Callable, Iterable
from dataclasses import dataclass, field
from datetime import UTC, datetime
from time import sleep as default_sleep

from sqlalchemy import select
from sqlalchemy.orm import Session

from nuvelle_crawler.db.models import ThirdPartyCrawlLog, ThirdPartyDramaResource
from nuvelle_crawler.db.repositories import (
    ThirdPartyCrawlLogRepository,
    ThirdPartyDramaRepository,
    ThirdPartyDramaResourcePayload,
)
from nuvelle_crawler.services.backfill import (
    DEFAULT_REQUEST_DELAY_SECONDS,
    SourceProtectionDetectedError,
)
from nuvelle_crawler.sources.base import DramaSourceAdapter


@dataclass(frozen=True)
class FailureCompensationSummary:
    crawl_log_id: int | None = None
    crawl_logs_scanned: int = 0
    list_pages_attempted: int = 0
    list_pages_changed: int = 0
    details_attempted: int = 0
    details_changed: int = 0
    failed_list_pages: list[dict] = field(default_factory=list)
    failed_details: list[dict] = field(default_factory=list)

    @property
    def error_count(self) -> int:
        return len(self.failed_list_pages) + len(self.failed_details)


class FailedCrawlCompensationService:
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
        crawl_log_ids: list[int] | None = None,
        delay_seconds: float = DEFAULT_REQUEST_DELAY_SECONDS,
        with_details: bool = True,
        list_retry_attempts: int = 2,
        detail_retry_attempts: int = 2,
    ) -> FailureCompensationSummary:
        if delay_seconds < 0:
            raise ValueError("delay_seconds must be >= 0")
        if list_retry_attempts < 0:
            raise ValueError("list_retry_attempts must be >= 0")
        if detail_retry_attempts < 0:
            raise ValueError("detail_retry_attempts must be >= 0")

        started_at = datetime.now(UTC)
        logs = self._load_logs(source=source, crawl_log_ids=crawl_log_ids)
        list_failures, detail_failures = self._collect_failures(logs)
        self._report(
            "compensation start "
            f"source={source} crawl_logs={','.join(str(log.id) for log in logs) or '-'} "
            f"list_failures={len(list_failures)} detail_failures={len(detail_failures)} "
            f"with_details={with_details} delay_seconds={delay_seconds} "
            f"list_retry_attempts={list_retry_attempts} "
            f"detail_retry_attempts={detail_retry_attempts}"
        )

        list_pages_attempted = 0
        list_pages_changed = 0
        details_attempted = 0
        details_changed = 0
        failed_list_pages: list[dict] = []
        failed_details: list[dict] = []
        fatal_error_already_recorded = False

        try:
            for failure in list_failures:
                self._pause(delay_seconds, list_pages_attempted + details_attempted)
                list_pages_attempted += 1
                language = failure.get("language")
                sort = str(failure.get("sort") or "time")
                page = int(failure["page"])
                self._report(
                    "compensation list start "
                    f"source={source} language={language or '-'} sort={sort} page={page}"
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
                    failed_list_pages.append(self._list_failure(failure, exc.__cause__ or exc))
                    fatal_error_already_recorded = True
                    raise
                except Exception as exc:
                    failed_list_pages.append(self._list_failure(failure, exc))
                    self._report(
                        "compensation list error "
                        f"source={source} language={language or '-'} sort={sort} page={page} error={exc}"
                    )
                    self.db.commit()
                    continue

                page_changed = 0
                for row in rows:
                    changed, payload = self._upsert_raw(row)
                    page_changed += changed
                    if with_details:
                        try:
                            detail_changed, detail_error = self._compensate_detail_payload(
                                payload=payload,
                                base_raw=row,
                                retry_attempts=detail_retry_attempts,
                                delay_seconds=delay_seconds,
                                completed_request_count=list_pages_attempted + details_attempted,
                            )
                        except SourceProtectionDetectedError as exc:
                            failed_details.append(self._detail_failure_from_payload(payload, exc.__cause__ or exc))
                            fatal_error_already_recorded = True
                            raise
                        details_attempted += 1
                        details_changed += detail_changed
                        if detail_error is not None:
                            failed_details.append(detail_error)

                list_pages_changed += page_changed
                self.db.commit()
                self._report(
                    "compensation list done "
                    f"source={source} language={language or '-'} sort={sort} page={page} "
                    f"rows={len(rows)} changed={page_changed}"
                )

            for failure in detail_failures:
                self._pause(delay_seconds, list_pages_attempted + details_attempted)
                details_attempted += 1
                try:
                    detail_changed, detail_error = self._compensate_detail_failure(
                        source=source,
                        failure=failure,
                        retry_attempts=detail_retry_attempts,
                        delay_seconds=delay_seconds,
                    )
                except SourceProtectionDetectedError as exc:
                    failed_details.append(self._detail_failure(failure, exc.__cause__ or exc))
                    fatal_error_already_recorded = True
                    raise
                details_changed += detail_changed
                if detail_error is not None:
                    failed_details.append(detail_error)
                self.db.commit()

            summary = FailureCompensationSummary(
                crawl_logs_scanned=len(logs),
                list_pages_attempted=list_pages_attempted,
                list_pages_changed=list_pages_changed,
                details_attempted=details_attempted,
                details_changed=details_changed,
                failed_list_pages=failed_list_pages,
                failed_details=failed_details,
            )
            status = "success" if summary.error_count == 0 else "error"
            log = self.logs.create(
                source=source,
                run_type="failure_compensation",
                status=status,
                started_at=started_at,
                finished_at=datetime.now(UTC),
                scanned_count=summary.list_pages_attempted + summary.details_attempted,
                changed_count=summary.list_pages_changed + summary.details_changed,
                error_count=summary.error_count,
                metadata={
                    "source_crawl_log_ids": [log.id for log in logs],
                    "list_pages_attempted": summary.list_pages_attempted,
                    "details_attempted": summary.details_attempted,
                    "failed_list_pages": summary.failed_list_pages,
                    "failed_details": summary.failed_details,
                },
            )
            summary = FailureCompensationSummary(
                crawl_log_id=log.id,
                crawl_logs_scanned=len(logs),
                list_pages_attempted=list_pages_attempted,
                list_pages_changed=list_pages_changed,
                details_attempted=details_attempted,
                details_changed=details_changed,
                failed_list_pages=failed_list_pages,
                failed_details=failed_details,
            )
            self.db.commit()
            self._report(
                "compensation done "
                f"list_pages_attempted={summary.list_pages_attempted} "
                f"details_attempted={summary.details_attempted} "
                f"errors={summary.error_count}"
            )
            return summary
        except Exception as exc:
            self.db.rollback()
            error_count = len(failed_list_pages) + len(failed_details)
            if not fatal_error_already_recorded:
                error_count += 1
            self.logs.create(
                source=source,
                run_type="failure_compensation",
                status="error",
                started_at=started_at,
                finished_at=datetime.now(UTC),
                scanned_count=list_pages_attempted + details_attempted,
                changed_count=list_pages_changed + details_changed,
                error_count=error_count,
                message=str(exc),
                metadata={
                    "source_crawl_log_ids": [log.id for log in logs],
                    "list_pages_attempted": list_pages_attempted,
                    "details_attempted": details_attempted,
                    "failed_list_pages": failed_list_pages,
                    "failed_details": failed_details,
                    "source_protection_detected": isinstance(exc, SourceProtectionDetectedError),
                },
            )
            self.db.commit()
            raise

    def _load_logs(self, *, source: str, crawl_log_ids: list[int] | None) -> list[ThirdPartyCrawlLog]:
        statement = select(ThirdPartyCrawlLog).where(ThirdPartyCrawlLog.source == source)
        if crawl_log_ids:
            statement = statement.where(ThirdPartyCrawlLog.id.in_(crawl_log_ids))
        else:
            statement = statement.where(ThirdPartyCrawlLog.run_type == "local_backfill")
        statement = statement.order_by(ThirdPartyCrawlLog.id)
        return list(self.db.scalars(statement).all())

    def _collect_failures(
        self,
        logs: Iterable[ThirdPartyCrawlLog],
    ) -> tuple[list[dict], list[dict]]:
        list_failures_by_key: dict[tuple, dict] = {}
        detail_failures_by_key: dict[tuple, dict] = {}

        for log in logs:
            metadata = log.log_metadata or {}
            for failure in metadata.get("failed_list_pages") or []:
                if "page" not in failure:
                    continue
                key = (
                    failure.get("language"),
                    failure.get("sort"),
                    int(failure["page"]),
                )
                list_failures_by_key[key] = failure
            for failure in metadata.get("failed_details") or []:
                if "external_id" not in failure or "book_type" not in failure:
                    continue
                key = (
                    str(failure["external_id"]),
                    str(failure["book_type"]),
                    failure.get("source_app"),
                    failure.get("language"),
                )
                detail_failures_by_key[key] = failure

        return list(list_failures_by_key.values()), list(detail_failures_by_key.values())

    def _compensate_detail_payload(
        self,
        *,
        payload: ThirdPartyDramaResourcePayload,
        base_raw: dict,
        retry_attempts: int,
        delay_seconds: float,
        completed_request_count: int,
    ) -> tuple[int, dict | None]:
        self._pause(delay_seconds, completed_request_count)
        self._report(
            "compensation detail start "
            f"external_id={payload.external_id} book_type={payload.book_type}"
        )
        try:
            detail_raw = self._get_detail_with_retries(
                external_id=payload.external_id,
                book_type=payload.book_type,
                retry_attempts=retry_attempts,
                delay_seconds=delay_seconds,
            )
            changed, _ = self._upsert_raw(self._merge_detail(base_raw, detail_raw))
            self._report(
                "compensation detail done "
                f"external_id={payload.external_id} changed={changed}"
            )
            return changed, None
        except SourceProtectionDetectedError:
            raise
        except Exception as exc:
            self._report(
                "compensation detail error "
                f"external_id={payload.external_id} book_type={payload.book_type} error={exc}"
            )
            return 0, self._detail_failure_from_payload(payload, exc)

    def _compensate_detail_failure(
        self,
        *,
        source: str,
        failure: dict,
        retry_attempts: int,
        delay_seconds: float,
    ) -> tuple[int, dict | None]:
        external_id = str(failure["external_id"])
        book_type = str(failure["book_type"])
        self._report(
            "compensation detail start "
            f"external_id={external_id} book_type={book_type}"
        )
        try:
            detail_raw = self._get_detail_with_retries(
                external_id=external_id,
                book_type=book_type,
                retry_attempts=retry_attempts,
                delay_seconds=delay_seconds,
            )
            existing = self._find_existing_resource(source=source, failure=failure)
            base_raw = existing.raw_data if existing is not None else {}
            changed, _ = self._upsert_raw(self._merge_detail(base_raw, detail_raw))
            self._report(f"compensation detail done external_id={external_id} changed={changed}")
            return changed, None
        except SourceProtectionDetectedError:
            raise
        except Exception as exc:
            self._report(
                "compensation detail error "
                f"external_id={external_id} book_type={book_type} error={exc}"
            )
            return 0, self._detail_failure(failure, exc)

    def _find_existing_resource(self, *, source: str, failure: dict) -> ThirdPartyDramaResource | None:
        statement = select(ThirdPartyDramaResource).where(
            ThirdPartyDramaResource.source == source,
            ThirdPartyDramaResource.external_id == str(failure["external_id"]),
            ThirdPartyDramaResource.book_type == str(failure["book_type"]),
        )
        if failure.get("source_app"):
            statement = statement.where(ThirdPartyDramaResource.source_app == failure["source_app"])
        if failure.get("language"):
            statement = statement.where(ThirdPartyDramaResource.language == failure["language"])
        statement = statement.order_by(ThirdPartyDramaResource.id.desc())
        return self.db.scalar(statement)

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
                    "compensation list retry "
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
                    "compensation detail retry "
                    f"external_id={external_id} book_type={book_type} "
                    f"attempt={failed_attempts}/{retry_attempts} error={exc}"
                )
                if delay_seconds:
                    self.sleep(delay_seconds)

    @staticmethod
    def _merge_detail(base_raw: dict, detail_raw: dict) -> dict:
        non_null_detail = {key: value for key, value in detail_raw.items() if value is not None}
        return {**base_raw, **non_null_detail}

    @classmethod
    def _detail_failure_from_payload(
        cls,
        payload: ThirdPartyDramaResourcePayload,
        exc: Exception,
    ) -> dict:
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
    def _detail_failure(cls, original_failure: dict, exc: Exception) -> dict:
        failure = {**original_failure, "error": str(exc)}
        status_code = cls._status_code(exc)
        if status_code is not None:
            failure["status_code"] = status_code
        return failure

    @classmethod
    def _list_failure(cls, original_failure: dict, exc: Exception) -> dict:
        failure = {**original_failure, "error": str(exc)}
        status_code = cls._status_code(exc)
        if status_code is not None:
            failure["status_code"] = status_code
        return failure

    @classmethod
    def _is_source_protection_error(cls, exc: Exception) -> bool:
        status_code = cls._status_code(exc)
        return status_code in {401, 403, 429, 503}

    @staticmethod
    def _status_code(exc: Exception) -> int | None:
        response = getattr(exc, "response", None)
        status_code = getattr(response, "status_code", None)
        return status_code if isinstance(status_code, int) else None

    def _pause(self, delay_seconds: float, completed_request_count: int) -> None:
        if delay_seconds and completed_request_count:
            self.sleep(delay_seconds)

    def _report(self, message: str) -> None:
        if self.reporter:
            self.reporter(message)

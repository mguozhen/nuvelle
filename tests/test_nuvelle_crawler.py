from datetime import UTC, datetime

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from nuvelle_crawler.db.models import Base, ThirdPartyCrawlLog, ThirdPartyDramaResource
from nuvelle_crawler.db.repositories import ThirdPartyDramaRepository
from nuvelle_crawler.config import Settings
from nuvelle_crawler.services.backfill import LocalDramaBackfillService, SourceProtectionDetectedError
from nuvelle_crawler.services.planner import CrawlerPlanner
from nuvelle_crawler.sources.config import get_source_config
from nuvelle_crawler.sources.dramacps_materials.client import DramaCpsMaterialsClient
from nuvelle_crawler.sources.dramacps_materials.mapper import DramaCpsMaterialsMapper
from nuvelle_crawler.sources.reelshort_cps.client import ReelShortCpsClient
from nuvelle_crawler.sources.reelshort_cps.mapper import ReelShortCpsMapper
from nuvelle_crawler.tasks.enqueuer import InMemoryTaskEnqueuer


def make_session():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine, autoflush=False, autocommit=False)()


def test_crawler_default_database_url_matches_api_postgres(monkeypatch) -> None:
    monkeypatch.delenv("DATABASE_URL", raising=False)

    settings = Settings(_env_file=None)

    assert settings.database_url == "postgresql+psycopg://nuvelle:nuvelle_dev_password@localhost:5432/nuvelle"


class FakeDramaAdapter:
    def __init__(
        self,
        *,
        pages: dict[tuple[str | None, str, int], list[dict]],
        details: dict[str, dict] | None = None,
        list_errors: dict[tuple[str | None, str, int], list[Exception]] | None = None,
        detail_errors: dict[str, Exception] | None = None,
    ):
        self.pages = pages
        self.details = details or {}
        self.list_errors = list_errors or {}
        self.detail_errors = detail_errors or {}
        self.mapper = ReelShortCpsMapper()
        self.list_calls: list[tuple[str | None, str, int]] = []
        self.detail_calls: list[tuple[str, str]] = []

    def list_page(self, *, page: int, language: str | None, sort: str) -> list[dict]:
        key = (language, sort, page)
        self.list_calls.append(key)
        errors = self.list_errors.get(key)
        if errors:
            raise errors.pop(0)
        return self.pages.get(key, [])

    def get_detail(self, *, external_id: str, book_type: str) -> dict:
        self.detail_calls.append((external_id, book_type))
        if external_id in self.detail_errors:
            raise self.detail_errors[external_id]
        return self.details[external_id]

    def to_resource_payload(self, raw: dict):
        return self.mapper.to_resource_payload(raw)


class FakeHttpResponse:
    def __init__(self, data: dict):
        self.data = data

    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict:
        return self.data


class FakeProtectedResponse:
    def __init__(self, status_code: int):
        self.status_code = status_code


class FakeHttpStatusError(Exception):
    def __init__(self, status_code: int):
        super().__init__(f"{status_code} response")
        self.response = FakeProtectedResponse(status_code)


class FakeHttpClient:
    def __init__(self):
        self.calls: list[tuple[str, dict, dict | None]] = []

    def post(self, path: str, *, json: dict, headers: dict | None = None) -> FakeHttpResponse:
        self.calls.append((path, json, headers))
        if "book_id" in json:
            return FakeHttpResponse({"code": 0, "data": {"id": json["book_id"]}})
        return FakeHttpResponse({"code": 0, "data": {"books": []}})


class FakeGetHttpClient:
    def __init__(self):
        self.calls: list[tuple[str, dict, dict | None]] = []

    def get(self, path: str, *, params: dict | None = None, headers: dict | None = None) -> FakeHttpResponse:
        self.calls.append((path, params or {}, headers))
        if params and "base_id" in params:
            return FakeHttpResponse(
                {
                    "base_id": params["base_id"],
                    "name": "Drama Detail",
                    "source": "stardusttv",
                    "lang": "tc",
                    "section": [{"series_no": 1, "origin_video": "https://example.com/1.m3u8"}],
                }
            )
        return FakeHttpResponse(
            {
                "items": [
                    {
                        "base_id": "166653",
                        "name": "Drama List",
                        "source": "stardusttv",
                        "lang": "tc",
                    }
                ],
                "next_page": True,
            }
        )


def test_reelshort_mapper_extracts_minimal_resource_fields() -> None:
    raw = {
        "id": "6825b313f981e578730e6174",
        "title": "Pregnant by My Ex's Professor Dad",
        "pic": "https://example.com/cover.jpg",
        "lang": "English",
        "book_type": 1,
        "chapter_count": 63,
        "pay_start": 5,
        "introduction": "A student-teacher romance hook.",
    }

    payload = ReelShortCpsMapper().to_resource_payload(raw)

    assert payload.source == "reelshort_cps"
    assert payload.external_id == "6825b313f981e578730e6174"
    assert payload.source_app == "reelshort"
    assert payload.book_type == "1"
    assert payload.language == "English"
    assert payload.title == "Pregnant by My Ex's Professor Dad"
    assert payload.cover_url == "https://example.com/cover.jpg"
    assert payload.episode_count == 63
    assert payload.free_episode_count == 4
    assert payload.raw_data == raw
    assert len(payload.raw_hash) == 64


def test_dramacps_mapper_extracts_material_fields_and_video_sections() -> None:
    raw = {
        "base_id": "166653",
        "name": "重生歸來尋女友：萬米高空的陰謀",
        "name_cn": "重生后，我回到女朋友在航班上消失当天_TW",
        "source": "stardusttv",
        "lang": "tc",
        "lang_other": "zh_TW",
        "cover_url": "https://example.com/cover.jpg",
        "description": "素材简介",
        "section": [
            {
                "section_id": 1,
                "series_no": 1,
                "section_title": "EP 1",
                "origin_video": "https://example.com/1.m3u8",
            },
            {
                "section_id": 2,
                "series_no": 2,
                "section_title": "EP 2",
                "origin_video": "https://example.com/2.m3u8",
            },
        ],
    }

    payload = DramaCpsMaterialsMapper().to_resource_payload(raw)

    assert payload.source == "dramacps_materials"
    assert payload.external_id == "166653"
    assert payload.source_app == "stardusttv"
    assert payload.book_type == "material"
    assert payload.language == "zh_TW"
    assert payload.title == "重生后，我回到女朋友在航班上消失当天_TW"
    assert payload.cover_url == "https://example.com/cover.jpg"
    assert payload.synopsis == "素材简介"
    assert payload.episode_count == 2
    assert payload.free_episode_count == 2
    assert payload.raw_data == raw
    assert len(payload.raw_hash) == 64


def test_repository_upserts_by_source_external_app_book_type_language() -> None:
    db = make_session()
    repository = ThirdPartyDramaRepository(db)
    mapper = ReelShortCpsMapper()
    first = mapper.to_resource_payload(
        {
            "id": "book-1",
            "title": "First Title",
            "pic": "https://example.com/first.jpg",
            "lang": "English",
            "book_type": 1,
            "chapter_count": 12,
            "pay_start": 4,
        }
    )
    second = mapper.to_resource_payload(
        {
            "id": "book-1",
            "title": "Updated Title",
            "pic": "https://example.com/second.jpg",
            "lang": "English",
            "book_type": 1,
            "chapter_count": 13,
            "pay_start": 5,
        }
    )

    created = repository.upsert(first, seen_at=datetime(2026, 6, 16, tzinfo=UTC))
    updated = repository.upsert(second, seen_at=datetime(2026, 6, 17, tzinfo=UTC))
    db.commit()

    rows = list(db.scalars(select(ThirdPartyDramaResource)).all())
    assert created.id == updated.id
    assert len(rows) == 1
    assert rows[0].title == "Updated Title"
    assert rows[0].cover_url == "https://example.com/second.jpg"
    assert rows[0].episode_count == 13
    assert rows[0].last_seen_at == datetime(2026, 6, 17, tzinfo=UTC)
    assert rows[0].last_changed_at == datetime(2026, 6, 17, tzinfo=UTC)


def test_planner_enqueues_list_page_tasks_without_calling_source() -> None:
    enqueuer = InMemoryTaskEnqueuer()
    planner = CrawlerPlanner(enqueuer=enqueuer, service_url="https://crawler.example.com")

    count = planner.plan_incremental(
        source="reelshort_cps",
        languages=["en"],
        sorts=["time", "money"],
        pages=2,
    )

    assert count == 4
    assert [task.queue for task in enqueuer.tasks] == ["reelshort-list-sync"] * 4
    assert [task.path for task in enqueuer.tasks] == ["/internal/tasks/list-page"] * 4
    assert enqueuer.tasks[0].payload == {
        "source": "reelshort_cps",
        "language": "en",
        "sort": "time",
        "page": 1,
    }
    assert enqueuer.tasks[-1].payload == {
        "source": "reelshort_cps",
        "language": "en",
        "sort": "money",
        "page": 2,
    }


def test_reelshort_client_uses_frontend_detail_payload_shape() -> None:
    fake_http = FakeHttpClient()
    client = ReelShortCpsClient(token="token")
    client.client = fake_http

    client.book_detail(external_id="book-1", book_type="0")

    path, payload, headers = fake_http.calls[0]
    assert path == "/api/v1/book/book-detail"
    assert payload == {"app": "reelshort", "book_id": "book-1", "book_type": 0}
    assert headers is not None
    assert headers["Authorization"] == "Bearer token"


def test_reelshort_client_sends_browser_like_headers() -> None:
    fake_http = FakeHttpClient()
    client = ReelShortCpsClient(token="token")
    client.client = fake_http

    client.list_books(page=1, language="en", sort="time")

    _, _, headers = fake_http.calls[0]
    assert headers is not None
    assert headers["User-Agent"].startswith("Mozilla/5.0")
    assert headers["Origin"] == "https://cps.reelshort.com"
    assert headers["Referer"] == "https://cps.reelshort.com/"
    assert headers["Sec-Fetch-Site"] == "same-origin"
    assert headers["Sec-Fetch-Mode"] == "cors"


def test_reelshort_source_config_uses_frontend_language_codes() -> None:
    languages = get_source_config("reelshort_cps")["languages"]

    assert "in" in languages
    assert "id" not in languages
    assert {"ar", "zh-TW", "it", "ro"}.issubset(languages)


def test_dramacps_client_uses_open_material_api() -> None:
    fake_http = FakeGetHttpClient()
    client = DramaCpsMaterialsClient(base_url="https://files.example.com")
    client.client = fake_http

    rows = client.list_materials(page=2, language="tc", limit=12)
    detail = client.material_detail(base_id="166653")

    assert rows["items"][0]["base_id"] == "166653"
    assert detail["section"][0]["origin_video"] == "https://example.com/1.m3u8"
    assert [(path, params) for path, params, _ in fake_http.calls] == [
        ("/api/open/dramas", {"page": 2, "limit": 12, "lang": "tc"}),
        ("/api/open/dramas", {"base_id": "166653"}),
    ]


def test_dramacps_client_sends_browser_like_headers() -> None:
    fake_http = FakeGetHttpClient()
    client = DramaCpsMaterialsClient(base_url="https://files.example.com")
    client.client = fake_http

    client.list_materials(page=1, language=None)

    _, _, headers = fake_http.calls[0]
    assert headers is not None
    assert headers["User-Agent"].startswith("Mozilla/5.0")
    assert headers["Origin"] == "https://dramacps.com"
    assert headers["Referer"] == "https://dramacps.com/dashboard"
    assert headers["Sec-Fetch-Site"] == "cross-site"
    assert headers["Sec-Fetch-Mode"] == "cors"


def test_dramacps_source_config_defaults_to_all_languages_once() -> None:
    config = get_source_config("dramacps_materials")

    assert config["adapter"] == "dramacps_materials"
    assert config["default_languages"] == [None]
    assert {"en", "tc", "id", "pl"}.issubset(config["languages"])


def test_local_backfill_stops_at_empty_page_and_upserts_rows() -> None:
    db = make_session()
    adapter = FakeDramaAdapter(
        pages={
            ("en", "time", 1): [
                {
                    "id": "book-1",
                    "title": "First",
                    "lang": "English",
                    "book_type": 1,
                },
                {
                    "id": "book-2",
                    "title": "Second",
                    "lang": "English",
                    "book_type": 1,
                },
            ],
            ("en", "time", 2): [],
        }
    )

    summary = LocalDramaBackfillService(db=db, adapter=adapter, sleep=lambda _: None).run(
        source="reelshort_cps",
        languages=["en"],
        sorts=["time"],
        max_pages=10,
        delay_seconds=0,
    )

    rows = list(db.scalars(select(ThirdPartyDramaResource)).all())
    assert adapter.list_calls == [("en", "time", 1), ("en", "time", 2)]
    assert summary.list_pages_scanned == 2
    assert summary.resources_scanned == 2
    assert summary.resources_changed == 2
    assert len(rows) == 2


def test_local_backfill_respects_max_pages() -> None:
    db = make_session()
    adapter = FakeDramaAdapter(
        pages={
            ("en", "time", 1): [{"id": "book-1", "title": "First", "lang": "English", "book_type": 1}],
            ("en", "time", 2): [{"id": "book-2", "title": "Second", "lang": "English", "book_type": 1}],
        }
    )

    summary = LocalDramaBackfillService(db=db, adapter=adapter, sleep=lambda _: None).run(
        source="reelshort_cps",
        languages=["en"],
        sorts=["time"],
        max_pages=1,
        delay_seconds=0,
    )

    rows = list(db.scalars(select(ThirdPartyDramaResource)).all())
    assert adapter.list_calls == [("en", "time", 1)]
    assert summary.list_pages_scanned == 1
    assert summary.resources_scanned == 1
    assert len(rows) == 1


def test_local_backfill_can_start_from_later_page() -> None:
    db = make_session()
    adapter = FakeDramaAdapter(
        pages={
            ("en", "time", 3): [{"id": "book-3", "title": "Third", "lang": "English", "book_type": 1}],
            ("en", "time", 4): [],
        }
    )

    summary = LocalDramaBackfillService(db=db, adapter=adapter, sleep=lambda _: None).run(
        source="reelshort_cps",
        languages=["en"],
        sorts=["time"],
        start_page=3,
        max_pages=10,
        delay_seconds=0,
    )

    rows = list(db.scalars(select(ThirdPartyDramaResource)).all())
    assert adapter.list_calls == [("en", "time", 3), ("en", "time", 4)]
    assert summary.list_pages_scanned == 2
    assert summary.resources_scanned == 1
    assert len(rows) == 1


def test_local_backfill_retries_list_page_errors() -> None:
    db = make_session()
    adapter = FakeDramaAdapter(
        pages={
            ("en", "time", 1): [{"id": "book-1", "title": "First", "lang": "English", "book_type": 1}],
            ("en", "time", 2): [],
        },
        list_errors={("en", "time", 1): [RuntimeError("list timeout")]},
    )

    summary = LocalDramaBackfillService(db=db, adapter=adapter, sleep=lambda _: None).run(
        source="reelshort_cps",
        languages=["en"],
        sorts=["time"],
        max_pages=10,
        delay_seconds=0,
        list_retry_attempts=1,
    )

    assert adapter.list_calls == [("en", "time", 1), ("en", "time", 1), ("en", "time", 2)]
    assert summary.resources_scanned == 1


def test_local_backfill_records_failed_list_page_after_retries() -> None:
    db = make_session()
    adapter = FakeDramaAdapter(
        pages={},
        list_errors={
            ("en", "time", 3): [
                RuntimeError("list timeout"),
                RuntimeError("list timeout again"),
            ]
        },
    )

    try:
        LocalDramaBackfillService(db=db, adapter=adapter, sleep=lambda _: None).run(
            source="reelshort_cps",
            languages=["en"],
            sorts=["time"],
            start_page=3,
            max_pages=1,
            delay_seconds=0,
            list_retry_attempts=1,
        )
    except RuntimeError:
        pass
    else:
        raise AssertionError("expected list page failure")

    log = db.scalar(select(ThirdPartyCrawlLog).order_by(ThirdPartyCrawlLog.id.desc()))
    assert adapter.list_calls == [("en", "time", 3), ("en", "time", 3)]
    assert log is not None
    assert log.status == "error"
    assert log.error_count == 1
    assert log.log_metadata["failed_list_pages"] == [
        {"language": "en", "sort": "time", "page": 3, "error": "list timeout again"}
    ]


def test_local_backfill_can_fetch_details_for_each_row() -> None:
    db = make_session()
    adapter = FakeDramaAdapter(
        pages={
            ("en", "time", 1): [{"id": "book-1", "title": "List Title", "lang": "English", "book_type": 1}],
            ("en", "time", 2): [],
        },
        details={
            "book-1": {
                "id": "book-1",
                "title": "Detail Title",
                "introduction": "Detail synopsis",
                "book_type": 1,
            }
        },
    )

    summary = LocalDramaBackfillService(db=db, adapter=adapter, sleep=lambda _: None).run(
        source="reelshort_cps",
        languages=["en"],
        sorts=["time"],
        max_pages=10,
        delay_seconds=0,
        with_details=True,
    )

    row = db.scalar(select(ThirdPartyDramaResource))
    assert adapter.detail_calls == [("book-1", "1")]
    assert summary.details_scanned == 1
    assert row is not None
    assert row.title == "Detail Title"
    assert row.synopsis == "Detail synopsis"
    assert row.language == "English"


def test_local_backfill_reports_progress_and_continues_detail_errors() -> None:
    db = make_session()
    messages: list[str] = []
    adapter = FakeDramaAdapter(
        pages={
            ("en", "time", 1): [
                {"id": "book-1", "title": "First", "lang": "English", "book_type": 1},
                {"id": "book-2", "title": "Second", "lang": "English", "book_type": 1},
            ],
            ("en", "time", 2): [],
        },
        details={"book-2": {"id": "book-2", "title": "Second Detail", "lang": "English", "book_type": 1}},
        detail_errors={"book-1": RuntimeError("detail unavailable")},
    )

    summary = LocalDramaBackfillService(db=db, adapter=adapter, sleep=lambda _: None, reporter=messages.append).run(
        source="reelshort_cps",
        languages=["en"],
        sorts=["time"],
        max_pages=10,
        delay_seconds=0,
        with_details=True,
    )

    rows = list(db.scalars(select(ThirdPartyDramaResource).order_by(ThirdPartyDramaResource.external_id)).all())
    assert summary.resources_scanned == 2
    assert summary.details_scanned == 1
    assert summary.detail_errors == 1
    assert [row.external_id for row in rows] == ["book-1", "book-2"]
    assert any("list start source=reelshort_cps language=en sort=time page=1" in message for message in messages)
    assert any("detail error external_id=book-1 book_type=1 error=detail unavailable" in message for message in messages)
    assert any("done resources_scanned=2 details_scanned=1 detail_errors=1" in message for message in messages)


def test_local_backfill_retries_detail_errors_and_records_failed_details() -> None:
    db = make_session()
    adapter = FakeDramaAdapter(
        pages={
            ("en", "time", 1): [{"id": "book-1", "title": "First", "lang": "English", "book_type": 1}],
            ("en", "time", 2): [],
        },
        detail_errors={"book-1": RuntimeError("temporary detail failure")},
    )

    summary = LocalDramaBackfillService(db=db, adapter=adapter, sleep=lambda _: None).run(
        source="reelshort_cps",
        languages=["en"],
        sorts=["time"],
        max_pages=10,
        delay_seconds=0,
        with_details=True,
        detail_retry_attempts=1,
    )

    log = db.scalar(select(ThirdPartyCrawlLog).order_by(ThirdPartyCrawlLog.id.desc()))
    assert adapter.detail_calls == [("book-1", "1"), ("book-1", "1")]
    assert summary.detail_errors == 1
    assert summary.failed_details == [
        {
            "external_id": "book-1",
            "book_type": "1",
            "error": "temporary detail failure",
            "language": "English",
            "source_app": "reelshort",
            "title": "First",
        }
    ]
    assert log is not None
    assert log.log_metadata["failed_details"] == summary.failed_details


def test_local_backfill_stops_on_source_protection_and_records_failed_detail() -> None:
    db = make_session()
    adapter = FakeDramaAdapter(
        pages={
            ("en", "time", 1): [{"id": "book-1", "title": "First", "lang": "English", "book_type": 1}],
        },
        detail_errors={"book-1": FakeHttpStatusError(429)},
    )

    try:
        LocalDramaBackfillService(db=db, adapter=adapter, sleep=lambda _: None).run(
            source="reelshort_cps",
            languages=["en"],
            sorts=["time"],
            max_pages=1,
            delay_seconds=0,
            with_details=True,
            detail_retry_attempts=3,
        )
    except SourceProtectionDetectedError:
        pass
    else:
        raise AssertionError("expected source protection error")

    log = db.scalar(select(ThirdPartyCrawlLog).order_by(ThirdPartyCrawlLog.id.desc()))
    assert adapter.detail_calls == [("book-1", "1")]
    assert log is not None
    assert log.status == "error"
    assert log.error_count == 1
    assert log.log_metadata["source_protection_detected"] is True
    assert log.log_metadata["failed_details"][0]["external_id"] == "book-1"
    assert log.log_metadata["failed_details"][0]["status_code"] == 429

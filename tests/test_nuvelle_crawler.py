from datetime import UTC, datetime

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from nuvelle_crawler.db.models import Base, ThirdPartyDramaResource
from nuvelle_crawler.db.repositories import ThirdPartyDramaRepository
from nuvelle_crawler.services.planner import CrawlerPlanner
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

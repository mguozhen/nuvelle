from collections.abc import Generator

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import db_session
from app.db.base import Base
from app.main import app


def install_test_db_override() -> None:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    testing_session = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    def override_db() -> Generator[Session, None, None]:
        db = testing_session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[db_session] = override_db


def test_votes_are_recorded_and_returned() -> None:
    install_test_db_override()
    client = TestClient(app)

    response = client.post(
        "/api/v1/votes",
        json={"drama_id": "7", "taster": "alex", "verdict": "fire", "score": 82, "tags": ["hook"]},
    )
    votes = client.get("/api/v1/votes")

    app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == {"ok": True, "rated": 1}
    assert votes.status_code == 200
    assert votes.json()["rated"] == ["7"]
    assert votes.json()["count"] == 1
    assert votes.json()["votes"]["7"][0]["verdict"] == "fire"


def test_promo_job_api_queues_and_finishes_with_mocked_generator(monkeypatch, tmp_path) -> None:
    install_test_db_override()
    from nuvelle_kit.schemas import PromoGenerationResult

    from app.services import promo_service

    def fake_generate_promo(request):
        output_dir = tmp_path / request.slug
        output_dir.mkdir()
        cover_path = output_dir / "cover.jpg"
        teaser_path = output_dir / "teaser.mp4"
        caption_path = output_dir / "caption.txt"
        plan_path = output_dir / "plan.json"
        cover_path.write_bytes(b"cover")
        teaser_path.write_bytes(b"teaser")
        caption_path.write_text("caption")
        plan_path.write_text('{"tt_safe": true, "tt_notes": "", "cover_warn": ""}')
        return PromoGenerationResult(
            output_dir=output_dir,
            cover_path=cover_path,
            teaser_path=teaser_path,
            caption_path=caption_path,
            plan_path=plan_path,
            caption_text="caption",
        )

    monkeypatch.setattr(promo_service, "generate_promo", fake_generate_promo)
    client = TestClient(app)

    response = client.post(
        "/api/v1/promo/jobs",
        json={
            "video_url": "https://example.com/episode.mp4",
            "title": "MY WIFE",
            "ep": 2,
            "dur": 15,
            "beats": [8, 10, 20],
            "prompt": "dramatic",
            "cover_url": "https://example.com/cover.jpg",
        },
    )
    payload = response.json()
    job = client.get(f"/api/v1/promo/jobs/{payload['job_id']}")

    app.dependency_overrides.clear()

    assert response.status_code == 200
    assert payload["job_id"]
    assert payload["status"] == "queued"
    assert job.status_code == 200
    assert job.json()["status"] == "done"
    assert job.json()["caption"] == "caption"
    assert job.json()["files"]["teaser"].endswith("/teaser.mp4")


def test_batch_api_queues_jobs_and_reports_status(monkeypatch, tmp_path) -> None:
    install_test_db_override()
    from nuvelle_kit.schemas import PromoGenerationResult

    from app.services import promo_service

    def fake_generate_promo(request):
        output_dir = tmp_path / request.slug
        output_dir.mkdir(exist_ok=True)
        cover_path = output_dir / "cover.jpg"
        teaser_path = output_dir / "teaser.mp4"
        caption_path = output_dir / "caption.txt"
        plan_path = output_dir / "plan.json"
        cover_path.write_bytes(b"cover")
        teaser_path.write_bytes(b"teaser")
        caption_path.write_text("caption")
        plan_path.write_text("{}")
        return PromoGenerationResult(
            output_dir=output_dir,
            cover_path=cover_path,
            teaser_path=teaser_path,
            caption_path=caption_path,
            plan_path=plan_path,
            caption_text="caption",
        )

    monkeypatch.setattr(promo_service, "generate_promo", fake_generate_promo)
    client = TestClient(app)

    response = client.post(
        "/api/v1/promo/batches",
        json={
            "title": "MY WIFE",
            "dur": 15,
            "episodes": {"1": "https://example.com/1.mp4", "2": "https://example.com/2.mp4"},
        },
    )
    payload = response.json()
    batch = client.get(f"/api/v1/promo/batches/{payload['batch_id']}")

    app.dependency_overrides.clear()

    assert response.status_code == 200
    assert len(payload["jobs"]) == 2
    assert batch.status_code == 200
    assert batch.json()["total"] == 2
    assert batch.json()["done"] == 2


def test_promo_job_api_passes_no_ai_to_generator(monkeypatch, tmp_path) -> None:
    install_test_db_override()
    from nuvelle_kit.schemas import PromoGenerationResult

    from app.services import promo_service

    def fake_generate_promo(request):
        assert request.no_ai is True
        output_dir = tmp_path / request.slug
        output_dir.mkdir()
        cover_path = output_dir / "cover.jpg"
        teaser_path = output_dir / "teaser.mp4"
        caption_path = output_dir / "caption.txt"
        plan_path = output_dir / "plan.json"
        cover_path.write_bytes(b"cover")
        teaser_path.write_bytes(b"teaser")
        caption_path.write_text("caption")
        plan_path.write_text("{}")
        return PromoGenerationResult(
            output_dir=output_dir,
            cover_path=cover_path,
            teaser_path=teaser_path,
            caption_path=caption_path,
            plan_path=plan_path,
            caption_text="caption",
        )

    monkeypatch.setattr(promo_service, "generate_promo", fake_generate_promo)
    client = TestClient(app)

    response = client.post(
        "/api/v1/promo/jobs",
        json={
            "video_url": "/tmp/input.mp4",
            "title": "No AI",
            "ep": 1,
            "dur": 10,
            "no_ai": True,
        },
    )
    payload = response.json()
    job = client.get(f"/api/v1/promo/jobs/{payload['job_id']}")

    app.dependency_overrides.clear()

    assert response.status_code == 200
    assert job.json()["status"] == "done"

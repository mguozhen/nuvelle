import shutil
from datetime import UTC, datetime

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import hash_invite_code
from app.models.admin_user import AdminInvite
from app.models.drama import Drama, DramaEpisode
from app.models.promo_job import PromoJob


def auth_header(client: TestClient, db: Session) -> dict[str, str]:
    db.add(
        AdminInvite(
            code_hash=hash_invite_code("PROMO"),
            role="promoter",
            max_uses=1,
            used_count=0,
            expires_at=datetime(2099, 1, 1, tzinfo=UTC),
        )
    )
    db.commit()
    registered = client.post(
        "/api/v1/auth/register",
        json={"email": "promo@example.com", "password": "secret123", "invite_code": "PROMO"},
    )
    return {"Authorization": f"Bearer {registered.json()['access_token']}"}


def seed_drama(db: Session) -> tuple[Drama, DramaEpisode]:
    drama = Drama(title="Promo Drama", platform="ReelShort", rs_book_id="promo-drama", episode_count=1)
    db.add(drama)
    db.flush()
    episode = DramaEpisode(
        drama_id=drama.id,
        episode_no=1,
        play_url="https://example.com/promo.mp4",
        poster_url="https://example.com/poster.jpg",
    )
    db.add(episode)
    db.commit()
    db.refresh(drama)
    db.refresh(episode)
    return drama, episode


def test_promo_job_api_queues_and_finishes_with_mocked_generator(
    client: TestClient, monkeypatch, tmp_path
) -> None:
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

    assert response.status_code == 200
    assert payload["job_id"]
    assert payload["status"] == "queued"
    assert payload["progress"] == 5
    assert job.status_code == 200
    assert job.json()["status"] == "done"
    assert job.json()["progress"] == 100
    assert job.json()["caption"] == "caption"
    assert job.json()["files"]["teaser"].endswith("/teaser.mp4")


def test_batch_api_queues_jobs_and_reports_status(client: TestClient, monkeypatch, tmp_path) -> None:
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

    assert response.status_code == 200
    assert len(payload["jobs"]) == 2
    assert batch.status_code == 200
    assert batch.json()["total"] == 2
    assert batch.json()["done"] == 2


def test_promo_job_api_passes_no_ai_to_generator(client: TestClient, monkeypatch, tmp_path) -> None:
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

    assert response.status_code == 200
    assert job.json()["status"] == "done"


def test_promo_job_uploads_generated_assets_to_configured_store(
    client: TestClient, db: Session, monkeypatch, tmp_path
) -> None:
    from nuvelle_kit.schemas import PromoGenerationResult

    from app.services import promo_service

    stores = []

    class FakeAssetStore:
        def __init__(self, settings) -> None:
            self.root = tmp_path / "work"
            self.persisted: dict[str, bytes] = {}
            self.cleaned: list[str] = []
            stores.append(self)

        def output_dir_for(self, job_id: str):
            return self.root / job_id

        def persist_job_assets(self, *, job_id, output_dir, asset_names):
            for filename in asset_names:
                path = output_dir / filename
                if path.exists():
                    self.persisted[filename] = path.read_bytes()
            return f"gs://bucket/promo/{job_id}"

        def cleanup_work_dir(self, output_dir) -> None:
            self.cleaned.append(str(output_dir))
            shutil.rmtree(output_dir, ignore_errors=True)

    def fake_generate_promo(request):
        output_dir = request.output_dir
        output_dir.mkdir(parents=True)
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

    monkeypatch.setattr(promo_service, "PromoAssetStore", FakeAssetStore)
    monkeypatch.setattr(promo_service, "generate_promo", fake_generate_promo)

    response = client.post(
        "/api/v1/promo/jobs",
        json={"video_url": "/tmp/input.mp4", "title": "GCS", "ep": 1, "dur": 10},
    )

    job = db.get(PromoJob, response.json()["job_id"])
    assert response.status_code == 200
    assert job is not None
    assert job.status == "done"
    assert job.output_dir == f"gs://bucket/promo/{job.id}"
    assert job.teaser_url == f"/promo/jobs/{job.id}/files/teaser.mp4"
    assert stores[0].persisted["teaser.mp4"] == b"teaser"
    assert stores[0].cleaned == [str(tmp_path / "work" / job.id)]
    assert not (tmp_path / "work" / job.id).exists()


def test_promo_job_file_response_supports_non_local_range_reads(db: Session) -> None:
    from app.services.promo_asset_store import StoredAsset
    from app.services.promo_service import PromoService

    job = PromoJob(
        id="gcs-job",
        status="done",
        title="GCS",
        episode=1,
        duration=10,
        source_url="https://example.com/input.mp4",
        output_dir="gs://bucket/promo/gcs-job",
    )
    db.add(job)
    db.commit()

    class FakeAssetStore:
        def local_asset_path(self, location, filename):
            return None

        def read_asset(self, location, filename, range_header):
            assert location == "gs://bucket/promo/gcs-job"
            assert filename == "teaser.mp4"
            assert range_header == "bytes=0-1"
            return StoredAsset(
                content=b"te",
                media_type="video/mp4",
                status_code=206,
                headers={
                    "Accept-Ranges": "bytes",
                    "Content-Range": "bytes 0-1/6",
                    "Content-Length": "2",
                },
            )

    service = PromoService(db)
    service.asset_store = FakeAssetStore()

    response = service.asset_response("gcs-job", "teaser.mp4", "bytes=0-1")

    assert response.status_code == 206
    assert response.body == b"te"
    assert response.headers["content-range"] == "bytes 0-1/6"


def test_authenticated_promo_job_stores_user_drama_episode_and_prompt(
    client: TestClient, db: Session, monkeypatch, tmp_path
) -> None:
    from nuvelle_kit.schemas import PromoGenerationResult

    from app.services import promo_service

    drama, episode = seed_drama(db)

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
    headers = auth_header(client, db)
    me = client.get("/api/v1/auth/me", headers=headers).json()

    response = client.post(
        "/api/v1/promo/jobs",
        headers=headers,
        json={
            "video_url": episode.play_url,
            "title": drama.title,
            "ep": 1,
            "dur": 13,
            "prompt": "make it tense",
            "drama_id": drama.id,
            "episode_id": episode.id,
        },
    )

    job = db.get(PromoJob, response.json()["job_id"])
    assert response.status_code == 200
    assert job is not None
    assert job.user_id == me["id"]
    assert job.drama_id == drama.id
    assert job.episode_id == episode.id
    assert job.prompt == "make it tense"


def test_promo_job_uses_refreshed_reelshort_play_url(
    client: TestClient, db: Session, monkeypatch, tmp_path
) -> None:
    from nuvelle_kit.schemas import PromoGenerationResult

    from app.services import promo_service
    from app.services.reelshort_video_service import ReelShortVideoService

    drama, episode = seed_drama(db)
    refreshed_url = "https://example.com/fresh-signed-url.mp4"
    seen_sources: list[str] = []

    def fake_refresh(self, *, drama_id, episode_id):
        assert drama_id == drama.id
        assert episode_id == episode.id
        return refreshed_url

    def fake_generate_promo(request):
        seen_sources.append(str(request.mp4))
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

    monkeypatch.setattr(ReelShortVideoService, "refresh_episode_play_url", fake_refresh)
    monkeypatch.setattr(promo_service, "generate_promo", fake_generate_promo)

    response = client.post(
        "/api/v1/promo/jobs",
        json={
            "video_url": "https://example.com/expired.mp4",
            "title": drama.title,
            "ep": 1,
            "dur": 13,
            "drama_id": drama.id,
            "episode_id": episode.id,
        },
    )

    assert response.status_code == 200
    assert response.json()["status"] == "queued"
    assert seen_sources == [refreshed_url]
    job = db.get(PromoJob, response.json()["job_id"])
    assert job is not None
    assert job.status == "done"
    assert job.source_url == refreshed_url


def test_authenticated_promo_job_allows_regenerating_same_drama(
    client: TestClient, db: Session, monkeypatch, tmp_path
) -> None:
    from nuvelle_kit.schemas import PromoGenerationResult

    from app.services import promo_service

    drama, episode = seed_drama(db)

    def fake_generate_promo(request):
        output_dir = tmp_path / request.slug / request.prompt.replace(" ", "_")
        output_dir.mkdir(parents=True)
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
    headers = auth_header(client, db)

    first = client.post(
        "/api/v1/promo/jobs",
        headers=headers,
        json={
            "video_url": episode.play_url,
            "title": drama.title,
            "ep": 1,
            "dur": 13,
            "prompt": "first",
            "drama_id": drama.id,
            "episode_id": episode.id,
        },
    )
    second = client.post(
        "/api/v1/promo/jobs",
        headers=headers,
        json={
            "video_url": episode.play_url,
            "title": drama.title,
            "ep": 1,
            "dur": 13,
            "prompt": "second",
            "drama_id": drama.id,
            "episode_id": episode.id,
        },
    )

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["status"] == "queued"
    assert second.json()["status"] == "queued"
    assert client.get(f"/api/v1/promo/jobs/{first.json()['job_id']}").json()["status"] == "done"
    assert client.get(f"/api/v1/promo/jobs/{second.json()['job_id']}").json()["status"] == "done"

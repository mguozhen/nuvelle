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


def test_votes_are_recorded_and_returned(client: TestClient) -> None:
    response = client.post(
        "/api/v1/votes",
        json={"drama_id": "7", "taster": "alex", "verdict": "fire", "score": 82, "tags": ["hook"]},
    )
    votes = client.get("/api/v1/votes")

    assert response.status_code == 200
    assert response.json() == {"ok": True, "rated": 1}
    assert votes.status_code == 200
    assert votes.json()["rated"] == ["7"]
    assert votes.json()["count"] == 1
    assert votes.json()["votes"]["7"][0]["verdict"] == "fire"


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
    assert job.status_code == 200
    assert job.json()["status"] == "done"
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

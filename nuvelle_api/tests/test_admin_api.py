from datetime import UTC, datetime

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import hash_invite_code
from app.models.admin_user import AdminInvite
from app.models.drama import Drama, DramaEpisode
from app.models.promo_job import PromoJob


def create_invite(db: Session, code: str, role: str = "promoter") -> None:
    db.add(
        AdminInvite(
            code_hash=hash_invite_code(code),
            role=role,
            max_uses=1,
            used_count=0,
            expires_at=datetime(2099, 1, 1, tzinfo=UTC),
        )
    )
    db.commit()


def auth_header(client: TestClient, db: Session, email: str, code: str) -> dict[str, str]:
    create_invite(db, code)
    registered = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "secret123", "invite_code": code},
    )
    return {"Authorization": f"Bearer {registered.json()['access_token']}"}


def seed_drama(
    db: Session,
    title: str,
    *,
    genre: str | None = None,
    language: str = "English",
    platform: str = "ReelShort",
    signal: str | None = None,
    tag: str = "Female",
    video_url: str | None = None,
    transferred: bool = True,
) -> tuple[Drama, DramaEpisode]:
    resolved_video_url = video_url or f"https://cdn.nuvelle.ai/videos/reelshort/{title}/episodes/0001.mp4"
    drama = Drama(
        title=title,
        platform=platform,
        genre=genre,
        language=language,
        tags=[tag],
        show_tags=[tag],
        cover_image_url="https://example.com/cover.jpg",
        video_url=resolved_video_url,
        synopsis_or_hook=f"{title} hook",
        signal=signal,
        episode_count=2,
        rs_book_id=f"rs-{title}",
        recent_revenue=2000,
        promoters_cnt=1000,
        platform_publish_at=datetime(2026, 6, 1, tzinfo=UTC),
        video_transfer_status="transferred" if transferred else None,
    )
    db.add(drama)
    db.flush()
    episode = DramaEpisode(
        drama_id=drama.id,
        episode_no=1,
        chapter_id=f"{title}-c1",
        play_url=resolved_video_url,
        poster_url="https://example.com/poster.jpg",
        gcs_uri=f"gs://video-bucket/videos/reelshort/{drama.id}/episodes/0001.mp4" if transferred else None,
        video_transfer_status="transferred" if transferred else None,
    )
    db.add(episode)
    db.commit()
    db.refresh(drama)
    db.refresh(episode)
    return drama, episode


def test_board_filters_by_query_language_tag_and_has_video(client: TestClient, db: Session) -> None:
    seed_drama(db, "Billionaire Bride", language="English", tag="Female")
    seed_drama(db, "Werewolf King", language="Spanish", tag="Fantasy")
    headers = auth_header(client, db, "promoter@example.com", "JOIN-1")

    response = client.get(
        "/api/v1/admin/dramas?q=billionaire&language=English&tag=Female&has_video=true",
        headers=headers,
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 1
    assert payload["items"][0]["title"] == "Billionaire Bride"
    assert payload["items"][0]["has_video"] is True
    assert payload["items"][0]["recent_revenue"] == 2000
    assert payload["items"][0]["seen"] is False


def test_board_only_returns_transferred_video_resources_by_default(client: TestClient, db: Session) -> None:
    transferred, _ = seed_drama(db, "Transferred Drama")
    seed_drama(db, "Expired Source Drama", transferred=False)
    headers = auth_header(client, db, "library@example.com", "JOIN-LIBRARY")

    response = client.get("/api/v1/admin/dramas?language=English", headers=headers)

    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 1
    assert payload["items"][0]["id"] == transferred.id
    assert payload["items"][0]["has_video"] is True


def test_admin_drama_filters_return_global_options(client: TestClient, db: Session) -> None:
    seed_drama(db, "Billionaire Bride", language="English", platform="ReelShort", tag="Female")
    seed_drama(db, "Werewolf King", language="Spanish", platform="DramaBox", tag="Fantasy")
    headers = auth_header(client, db, "filters@example.com", "JOIN-FILTERS")

    response = client.get("/api/v1/admin/dramas/filters", headers=headers)

    assert response.status_code == 200
    payload = response.json()
    assert payload["platforms"] == ["DramaBox", "ReelShort"]
    assert payload["languages"] == ["English", "Spanish"]
    assert payload["tags"] == ["Fantasy", "Female"]


def test_board_filters_by_min_score(client: TestClient, db: Session) -> None:
    seed_drama(
        db,
        "Billionaire Bride",
        genre="Hidden Identity",
        signal="revenue $1,000,000 | 12,000 promoters",
        video_url="https://example.com/high.mp4",
    )
    seed_drama(db, "Quiet Drama", tag="Slice of Life")
    headers = auth_header(client, db, "promoter@example.com", "JOIN-SCORE")

    response = client.get("/api/v1/admin/dramas?min_score=70", headers=headers)

    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 1
    assert payload["items"][0]["title"] == "Billionaire Bride"
    assert payload["items"][0]["genre"] == "Hidden Identity"
    assert payload["items"][0]["signal"] == "revenue $1,000,000 | 12,000 promoters"
    assert payload["items"][0]["video_url"] == "https://example.com/high.mp4"


def test_swipe_next_excludes_handled_drama_for_same_user(client: TestClient, db: Session) -> None:
    first, _ = seed_drama(db, "First Drama")
    second, _ = seed_drama(db, "Second Drama")
    headers = auth_header(client, db, "promoter@example.com", "JOIN-2")

    event = client.post(
        "/api/v1/admin/drama-events",
        headers=headers,
        json={"drama_id": first.id, "event_type": "seen"},
    )
    response = client.get("/api/v1/admin/swipe/next", headers=headers)

    assert event.status_code == 200
    assert response.status_code == 200
    assert response.json()["id"] == second.id


def test_swipe_next_skips_untransferred_video_resources(client: TestClient, db: Session) -> None:
    transferred, _ = seed_drama(db, "Transferred Swipe")
    seed_drama(db, "Expired Swipe", transferred=False)
    headers = auth_header(client, db, "swipe-filter@example.com", "JOIN-SWIPE-FILTER")

    response = client.get("/api/v1/admin/swipe/next", headers=headers)

    assert response.status_code == 200
    assert response.json()["id"] == transferred.id


def test_swipe_next_only_returns_english_dramas(client: TestClient, db: Session) -> None:
    english, _ = seed_drama(db, "English Drama", language="English")
    seed_drama(db, "Spanish Drama", language="Spanish")
    headers = auth_header(client, db, "promoter@example.com", "JOIN-EN")

    response = client.get("/api/v1/admin/swipe/next", headers=headers)

    assert response.status_code == 200
    assert response.json()["id"] == english.id
    assert response.json()["language"] == "English"


def test_swipe_events_are_user_scoped(client: TestClient, db: Session) -> None:
    drama, _ = seed_drama(db, "Shared Drama")
    first_user = auth_header(client, db, "one@example.com", "JOIN-3")
    second_user = auth_header(client, db, "two@example.com", "JOIN-4")
    client.post(
        "/api/v1/admin/drama-events",
        headers=first_user,
        json={"drama_id": drama.id, "event_type": "seen"},
    )

    response = client.get("/api/v1/admin/swipe/next", headers=second_user)

    assert response.status_code == 200
    assert response.json()["id"] == drama.id


def test_admin_drama_detail_only_includes_transferred_episodes(client: TestClient, db: Session) -> None:
    drama, transferred_episode = seed_drama(db, "Episode Filter")
    db.add(
        DramaEpisode(
            drama_id=drama.id,
            episode_no=2,
            chapter_id="Episode Filter-c2",
            play_url="https://expired.example.com/episode-2.mp4",
            poster_url="https://example.com/poster-2.jpg",
        )
    )
    db.commit()
    headers = auth_header(client, db, "detail-filter@example.com", "JOIN-DETAIL-FILTER")

    response = client.get(f"/api/v1/admin/dramas/{drama.id}", headers=headers)

    assert response.status_code == 200
    episodes = response.json()["episodes"]
    assert [episode["id"] for episode in episodes] == [transferred_episode.id]


def test_generated_library_returns_current_user_jobs(client: TestClient, db: Session) -> None:
    drama, episode = seed_drama(db, "Generated Drama")
    headers = auth_header(client, db, "promoter@example.com", "JOIN-5")
    other_headers = auth_header(client, db, "other@example.com", "JOIN-6")
    user = client.get("/api/v1/auth/me", headers=headers).json()
    other_user = client.get("/api/v1/auth/me", headers=other_headers).json()
    db.add(
        PromoJob(
            id="mine",
            user_id=user["id"],
            drama_id=drama.id,
            episode_id=episode.id,
            status="queued",
            title=drama.title,
            episode=1,
            duration=20,
            source_url=episode.play_url,
            prompt="high tension",
        )
    )
    db.add(
        PromoJob(
            id="other",
            user_id=other_user["id"],
            status="queued",
            title="Other",
            episode=1,
            duration=20,
            source_url="https://example.com/other.mp4",
        )
    )
    db.commit()

    response = client.get("/api/v1/admin/generated", headers=headers)

    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 1
    assert payload["items"][0]["job_id"] == "mine"
    assert payload["items"][0]["progress"] == 5
    assert payload["items"][0]["prompt"] == "high tension"
    assert payload["items"][0]["drama"]["title"] == "Generated Drama"


def test_generated_library_includes_existing_completed_job(client: TestClient, db: Session) -> None:
    drama, episode = seed_drama(db, "Done Drama")
    headers = auth_header(client, db, "promoter@example.com", "JOIN-7")
    me = client.get("/api/v1/auth/me", headers=headers).json()
    db.add(
        PromoJob(
            id="done-job",
            user_id=me["id"],
            drama_id=drama.id,
            episode_id=episode.id,
            status="done",
            title=drama.title,
            episode=1,
            duration=13,
            source_url=episode.play_url,
            prompt="done prompt",
            teaser_url="/promo/jobs/done-job/files/teaser.mp4",
            cover_url="/promo/jobs/done-job/files/cover.jpg",
            caption="caption",
        )
    )
    db.commit()

    response = client.get("/api/v1/admin/generated/done-job", headers=headers)

    assert response.status_code == 200
    assert response.json()["status"] == "done"
    assert response.json()["progress"] == 100
    assert response.json()["files"]["teaser"].endswith("teaser.mp4")


def test_admin_drama_marks_generated_episode_status(client: TestClient, db: Session) -> None:
    drama, episode = seed_drama(db, "Generated Episode")
    headers = auth_header(client, db, "promoter@example.com", "JOIN-8")
    me = client.get("/api/v1/auth/me", headers=headers).json()
    db.add(
        PromoJob(
            id="episode-job",
            user_id=me["id"],
            drama_id=drama.id,
            episode_id=episode.id,
            status="rendering",
            title=drama.title,
            episode=1,
            duration=30,
            source_url=episode.play_url,
        )
    )
    db.commit()

    listing = client.get("/api/v1/admin/dramas?has_video=true", headers=headers)
    detail = client.get(f"/api/v1/admin/dramas/{drama.id}", headers=headers)

    assert listing.status_code == 200
    item = next(item for item in listing.json()["items"] if item["id"] == drama.id)
    assert item["generated_count"] == 1
    assert item["generation_status"] == "rendering"
    assert item["generation_progress"] == 70
    assert detail.status_code == 200
    assert detail.json()["episodes"][0]["generation_status"] == "rendering"
    assert detail.json()["episodes"][0]["generation_progress"] == 70

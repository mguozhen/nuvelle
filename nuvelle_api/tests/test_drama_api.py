from sqlalchemy.orm import Session

from app.models.drama import Drama, DramaEpisode


def seed_public_drama(db: Session) -> Drama:
    drama = Drama(
        title="Playable Drama",
        platform="ReelShort",
        genre="Romance",
        language="English",
        cover_image_url="https://cdn.nuvelle.ai/covers/playable.jpg",
        video_url="https://cdn.nuvelle.ai/videos/reelshort/1/episodes/0001.mp4",
        source_url="https://reelslink.com/cps/example",
        episode_count=2,
        synopsis_or_hook="A stable playback test.",
        rs_book_id="book-public",
        video_transfer_status="transferred",
        video_transfer_total_episodes=2,
        video_transfer_done_episodes=2,
        video_transfer_failed_episodes=0,
    )
    db.add(drama)
    db.flush()
    db.add_all(
        [
            DramaEpisode(
                drama_id=drama.id,
                episode_no=1,
                play_url="https://cdn.nuvelle.ai/videos/reelshort/1/episodes/0001.mp4",
                source_play_url="https://third-party.example.com/expired-1.mp4",
                gcs_uri="gs://bucket/videos/reelshort/1/episodes/0001.mp4",
                video_transfer_status="transferred",
            ),
            DramaEpisode(
                drama_id=drama.id,
                episode_no=2,
                play_url="https://cdn.nuvelle.ai/videos/reelshort/1/episodes/0002.mp4",
                source_play_url="https://third-party.example.com/expired-2.mp4",
                gcs_uri="gs://bucket/videos/reelshort/1/episodes/0002.mp4",
                video_transfer_status="transferred",
            ),
        ]
    )
    db.commit()
    db.refresh(drama)
    return drama


def test_public_drama_detail_returns_playable_episodes(client, db: Session) -> None:
    drama = seed_public_drama(db)

    response = client.get(f"/api/v1/dramas/{drama.id}")

    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == drama.id
    assert payload["title"] == "Playable Drama"
    assert payload["video_url"] == "https://cdn.nuvelle.ai/videos/reelshort/1/episodes/0001.mp4"
    assert payload["video_transfer_status"] == "transferred"
    assert payload["video_transfer_total_episodes"] == 2
    assert payload["video_transfer_done_episodes"] == 2
    assert payload["video_transfer_failed_episodes"] == 0
    assert payload["episodes"] == [
        {
            "id": 1,
            "episode_no": 1,
            "play_url": "https://cdn.nuvelle.ai/videos/reelshort/1/episodes/0001.mp4",
            "poster_url": None,
            "video_transfer_status": "transferred",
        },
        {
            "id": 2,
            "episode_no": 2,
            "play_url": "https://cdn.nuvelle.ai/videos/reelshort/1/episodes/0002.mp4",
            "poster_url": None,
            "video_transfer_status": "transferred",
        },
    ]
    assert "source_play_url" not in payload["episodes"][0]
    assert "gcs_uri" not in payload["episodes"][0]


def test_public_drama_detail_returns_404_for_missing_drama(client) -> None:
    response = client.get("/api/v1/dramas/999999")

    assert response.status_code == 404

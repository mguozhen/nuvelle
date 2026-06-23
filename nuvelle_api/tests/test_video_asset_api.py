from app.api.v1.routes import video_assets
from app.storage.object_store import StoredObject


class FakeObjectStorage:
    def __init__(self, **kwargs) -> None:
        self.kwargs = kwargs

    def read_object(self, location: str, object_name: str, range_header: str | None = None) -> StoredObject:
        assert location == "gs://video-bucket/videos/reelshort/1/episodes"
        assert object_name == "0001.mp4"
        assert range_header == "bytes=0-1"
        return StoredObject(
            content=b"ab",
            media_type="video/mp4",
            headers={
                "Accept-Ranges": "bytes",
                "Content-Range": "bytes 0-1/30",
                "Content-Length": "2",
            },
            status_code=206,
        )


def test_video_asset_proxy_streams_private_gcs_object(client, monkeypatch) -> None:
    monkeypatch.setattr(video_assets, "ObjectStorage", FakeObjectStorage)
    monkeypatch.setattr(video_assets.settings, "video_gcs_bucket", "video-bucket")
    monkeypatch.setattr(video_assets.settings, "promo_gcs_bucket", "")
    monkeypatch.setattr(video_assets.settings, "video_gcs_prefix", "videos")

    response = client.get(
        "/api/v1/video-assets/videos/reelshort/1/episodes/0001.mp4",
        headers={"Range": "bytes=0-1"},
    )

    assert response.status_code == 206
    assert response.content == b"ab"
    assert response.headers["content-range"] == "bytes 0-1/30"
    assert response.headers["accept-ranges"] == "bytes"

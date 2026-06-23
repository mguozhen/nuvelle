import io
import json

from app.services.reelshort_video_transfer_service import ReelShortVideoTransferResponse
from app.tasks import transfer_reelshort_videos


class DummySession:
    def __init__(self) -> None:
        self.closed = False

    def close(self) -> None:
        self.closed = True


def test_transfer_task_builds_request_from_cli_args() -> None:
    request = transfer_reelshort_videos.request_from_args(
        transfer_reelshort_videos.parse_args(
            [
                "--limit",
                "500",
                "--language",
                "English",
                "--start-after-drama-id",
                "100",
                "--retry-failed",
                "--dry-run",
            ]
        )
    )

    assert request.limit == 500
    assert request.language == "English"
    assert request.start_after_drama_id == 100
    assert request.retry_failed is True
    assert request.dry_run is True


def test_transfer_task_runs_service_and_prints_json(monkeypatch) -> None:
    session = DummySession()
    captured = {}

    class DummyTransferService:
        def __init__(self, db) -> None:
            captured["db"] = db

        def run(self, request):
            captured["request"] = request
            return ReelShortVideoTransferResponse(
                scanned_dramas=1,
                transferred_dramas=1,
                transferred_episodes=2,
                last_drama_id=42,
            )

    monkeypatch.setattr(transfer_reelshort_videos, "SessionLocal", lambda: session)
    monkeypatch.setattr(transfer_reelshort_videos, "ReelShortVideoTransferService", DummyTransferService)

    output = io.StringIO()
    exit_code = transfer_reelshort_videos.run(
        ["--limit", "500", "--language", "English", "--pretty"],
        output=output,
    )

    assert exit_code == 0
    assert captured["db"] is session
    assert captured["request"].limit == 500
    assert captured["request"].language == "English"
    assert session.closed is True
    assert json.loads(output.getvalue()) == {
        "scanned_dramas": 1,
        "transferred_dramas": 1,
        "partial_failed_dramas": 0,
        "failed_dramas": 0,
        "skipped_dramas": 0,
        "transferred_episodes": 2,
        "failed_episodes": 0,
        "skipped_episodes": 0,
        "last_drama_id": 42,
    }

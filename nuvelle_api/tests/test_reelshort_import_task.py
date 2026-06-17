import io
import json

from app.schemas.admin import ReelShortSyncResponse
from app.tasks import import_reelshort


class DummySession:
    def __init__(self) -> None:
        self.closed = False

    def close(self) -> None:
        self.closed = True


def test_import_task_builds_payload_from_cli_args() -> None:
    payload = import_reelshort.payload_from_args(
        import_reelshort.parse_args(["--limit", "25", "--resource-id", "42", "--dry-run"])
    )

    assert payload.limit == 25
    assert payload.resource_id == 42
    assert payload.dry_run is True


def test_import_task_runs_service_and_prints_json(monkeypatch) -> None:
    session = DummySession()
    captured = {}

    class DummyImportService:
        def __init__(self, db) -> None:
            captured["db"] = db

        def sync(self, payload):
            captured["payload"] = payload
            return ReelShortSyncResponse(imported=2, updated=1, skipped=0, failed=0)

    monkeypatch.setattr(import_reelshort, "SessionLocal", lambda: session)
    monkeypatch.setattr(import_reelshort, "ReelShortImportService", DummyImportService)

    output = io.StringIO()
    exit_code = import_reelshort.run(["--limit", "25", "--resource-id", "42", "--dry-run"], output=output)

    assert exit_code == 0
    assert captured["db"] is session
    assert captured["payload"].limit == 25
    assert captured["payload"].resource_id == 42
    assert captured["payload"].dry_run is True
    assert session.closed is True
    assert json.loads(output.getvalue()) == {"imported": 2, "updated": 1, "skipped": 0, "failed": 0}

from fastapi.testclient import TestClient

from app.main import app


def test_live_health_does_not_require_database() -> None:
    client = TestClient(app)

    response = client.get("/api/v1/health/live")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "not_checked"}

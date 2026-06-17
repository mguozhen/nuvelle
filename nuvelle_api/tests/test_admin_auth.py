from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import hash_invite_code
from app.models.admin_user import AdminInvite


def create_invite(db: Session, code: str, *, expires_at: datetime | None = None, max_uses: int = 1) -> None:
    db.add(
        AdminInvite(
            code_hash=hash_invite_code(code),
            role="promoter",
            max_uses=max_uses,
            used_count=0,
            expires_at=expires_at or datetime.now(UTC) + timedelta(days=1),
        )
    )
    db.commit()


def test_register_with_valid_invite_returns_token(client: TestClient, db: Session) -> None:
    create_invite(db, "JOIN")

    response = client.post(
        "/api/v1/auth/register",
        json={"email": "Promoter@Example.com", "password": "secret123", "invite_code": "JOIN"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["access_token"]
    assert payload["user"]["email"] == "promoter@example.com"
    assert payload["user"]["role"] == "promoter"


def test_register_rejects_expired_invite(client: TestClient, db: Session) -> None:
    create_invite(db, "OLD", expires_at=datetime.now(UTC) - timedelta(seconds=1))

    response = client.post(
        "/api/v1/auth/register",
        json={"email": "late@example.com", "password": "secret123", "invite_code": "OLD"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "invite code is invalid or expired"


def test_login_rejects_wrong_password(client: TestClient, db: Session) -> None:
    create_invite(db, "JOIN")
    client.post(
        "/api/v1/auth/register",
        json={"email": "promoter@example.com", "password": "secret123", "invite_code": "JOIN"},
    )

    response = client.post(
        "/api/v1/auth/login",
        json={"email": "promoter@example.com", "password": "wrong-password"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "invalid email or password"


def test_me_returns_current_user(client: TestClient, db: Session) -> None:
    create_invite(db, "JOIN")
    registered = client.post(
        "/api/v1/auth/register",
        json={"email": "promoter@example.com", "password": "secret123", "invite_code": "JOIN"},
    )
    token = registered.json()["access_token"]

    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    assert response.json()["email"] == "promoter@example.com"

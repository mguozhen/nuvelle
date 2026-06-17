from collections.abc import Generator
from typing import Annotated

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.admin_user import AdminUser
from app.services.auth_service import AuthService


def db_session() -> Generator[Session, None, None]:
    yield from get_db()


DbSession = Annotated[Session, Depends(db_session)]


def current_user(
    db: DbSession,
    authorization: Annotated[str | None, Header()] = None,
) -> AdminUser:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="missing bearer token")
    token = authorization.split(" ", 1)[1].strip()
    service = AuthService(db)
    return service.user_from_token_subject(service.token_subject(token))


def optional_current_user(
    db: DbSession,
    authorization: Annotated[str | None, Header()] = None,
) -> AdminUser | None:
    if not authorization:
        return None
    return current_user(db, authorization)


def admin_user(user: Annotated[AdminUser, Depends(current_user)]) -> AdminUser:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="admin role required")
    return user


CurrentUser = Annotated[AdminUser, Depends(current_user)]
OptionalCurrentUser = Annotated[AdminUser | None, Depends(optional_current_user)]
AdminOnlyUser = Annotated[AdminUser, Depends(admin_user)]

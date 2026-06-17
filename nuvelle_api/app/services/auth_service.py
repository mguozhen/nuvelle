from datetime import UTC, datetime

import jwt
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    hash_invite_code,
    hash_password,
    normalize_email,
    verify_password,
)
from app.models.admin_user import AdminUser, AdminUserStatus
from app.repositories.admin_user_repository import AdminUserRepository
from app.schemas.auth import AuthResponse, LoginRequest, RegisterRequest


class AuthService:
    def __init__(self, db: Session) -> None:
        self.repository = AdminUserRepository(db)

    def register(self, payload: RegisterRequest) -> AuthResponse:
        email = normalize_email(payload.email)
        if self.repository.get_user_by_email(email):
            raise HTTPException(status_code=400, detail="email already registered")

        invite = self.repository.get_invite_by_hash(hash_invite_code(payload.invite_code))
        if invite is None or invite.used_count >= invite.max_uses or self._is_expired(invite.expires_at):
            raise HTTPException(status_code=400, detail="invite code is invalid or expired")

        user = self.repository.add_user(
            AdminUser(
                email=email,
                password_hash=hash_password(payload.password),
                role=invite.role,
                status=AdminUserStatus.active.value,
            )
        )
        invite.used_count += 1
        self.repository.update_invite(invite)
        return self._auth_response(user)

    def login(self, payload: LoginRequest) -> AuthResponse:
        email = normalize_email(payload.email)
        user = self.repository.get_user_by_email(email)
        if user is None or not verify_password(payload.password, user.password_hash):
            raise HTTPException(status_code=401, detail="invalid email or password")
        if user.status != AdminUserStatus.active.value:
            raise HTTPException(status_code=403, detail="user is disabled")
        user.last_login_at = datetime.now(UTC)
        self.repository.update_user(user)
        return self._auth_response(user)

    def user_from_token_subject(self, subject: str) -> AdminUser:
        try:
            user_id = int(subject)
        except ValueError as exc:
            raise HTTPException(status_code=401, detail="invalid token") from exc
        user = self.repository.get_user(user_id)
        if user is None or user.status != AdminUserStatus.active.value:
            raise HTTPException(status_code=401, detail="invalid token")
        return user

    @staticmethod
    def token_subject(token: str) -> str:
        from app.core.security import decode_access_token

        try:
            payload = decode_access_token(token)
        except jwt.PyJWTError as exc:
            raise HTTPException(status_code=401, detail="invalid token") from exc
        subject = payload.get("sub")
        if not isinstance(subject, str):
            raise HTTPException(status_code=401, detail="invalid token")
        return subject

    @staticmethod
    def _is_expired(value: datetime | None) -> bool:
        if value is None:
            return False
        current = value if value.tzinfo else value.replace(tzinfo=UTC)
        return current <= datetime.now(UTC)

    @staticmethod
    def _auth_response(user: AdminUser) -> AuthResponse:
        return AuthResponse(access_token=create_access_token(str(user.id)), user=user)

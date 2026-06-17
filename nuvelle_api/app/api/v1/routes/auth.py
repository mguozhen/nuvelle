from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.schemas.auth import AdminUserRead, AuthResponse, LoginRequest, RegisterRequest
from app.services.auth_service import AuthService

router = APIRouter()


@router.post("/register", response_model=AuthResponse)
def register(payload: RegisterRequest, db: DbSession) -> AuthResponse:
    return AuthService(db).register(payload)


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: DbSession) -> AuthResponse:
    return AuthService(db).login(payload)


@router.get("/me", response_model=AdminUserRead)
def me(user: CurrentUser) -> AdminUserRead:
    return AdminUserRead.model_validate(user)


@router.post("/logout")
def logout() -> dict[str, bool]:
    return {"ok": True}

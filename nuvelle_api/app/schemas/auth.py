from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AdminUserRead(BaseModel):
    id: int
    email: str
    role: str
    status: str
    last_login_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class RegisterRequest(BaseModel):
    email: str = Field(min_length=3)
    password: str = Field(min_length=6)
    invite_code: str = Field(min_length=1)


class LoginRequest(BaseModel):
    email: str = Field(min_length=3)
    password: str = Field(min_length=1)


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: AdminUserRead

from enum import StrEnum
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import TimestampMixin


class AdminUserRole(StrEnum):
    admin = "admin"
    promoter = "promoter"


class AdminUserStatus(StrEnum):
    active = "active"
    disabled = "disabled"


class AdminUser(TimestampMixin, Base):
    __tablename__ = "admin_users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(320), nullable=False, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(40), nullable=False, default=AdminUserRole.promoter.value, index=True)
    status: Mapped[str] = mapped_column(String(40), nullable=False, default=AdminUserStatus.active.value, index=True)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class AdminInvite(TimestampMixin, Base):
    __tablename__ = "admin_invites"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    code_hash: Mapped[str] = mapped_column(String(128), nullable=False, unique=True, index=True)
    role: Mapped[str] = mapped_column(String(40), nullable=False, default=AdminUserRole.promoter.value, index=True)
    max_uses: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    used_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    created_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("admin_users.id"))

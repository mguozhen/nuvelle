from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.admin_user import AdminInvite, AdminUser


class AdminUserRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_user(self, user_id: int) -> AdminUser | None:
        return self.db.get(AdminUser, user_id)

    def get_user_by_email(self, email: str) -> AdminUser | None:
        stmt = select(AdminUser).where(AdminUser.email == email)
        return self.db.scalars(stmt).first()

    def get_invite_by_hash(self, code_hash: str) -> AdminInvite | None:
        stmt = select(AdminInvite).where(AdminInvite.code_hash == code_hash)
        return self.db.scalars(stmt).first()

    def add_user(self, user: AdminUser) -> AdminUser:
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def update_user(self, user: AdminUser) -> AdminUser:
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def update_invite(self, invite: AdminInvite) -> AdminInvite:
        self.db.add(invite)
        self.db.commit()
        self.db.refresh(invite)
        return invite

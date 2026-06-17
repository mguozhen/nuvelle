from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.admin_user import AdminUser
from app.models.user_drama_event import UserDramaEvent
from app.schemas.admin import DramaEventCreate, DramaEventResponse


class UserEventService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def record(self, user: AdminUser, payload: DramaEventCreate) -> DramaEventResponse:
        stmt = select(UserDramaEvent).where(
            UserDramaEvent.user_id == user.id,
            UserDramaEvent.drama_id == payload.drama_id,
            UserDramaEvent.event_type == payload.event_type,
        )
        event = self.db.scalars(stmt).first()
        if event is None:
            event = UserDramaEvent(user_id=user.id, drama_id=payload.drama_id, event_type=payload.event_type)
            self.db.add(event)
        event.episode_id = payload.episode_id
        event.verdict = payload.verdict
        event.score = payload.score
        event.event_metadata = payload.metadata
        self.db.commit()
        self.db.refresh(event)
        return DramaEventResponse(ok=True, event_id=event.id)

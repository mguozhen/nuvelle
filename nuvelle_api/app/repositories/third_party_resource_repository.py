from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.third_party_resource import ThirdPartyDramaResource


class ThirdPartyResourceRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_reelshort(self, *, limit: int, resource_id: int | None = None) -> list[ThirdPartyDramaResource]:
        stmt = select(ThirdPartyDramaResource).where(
            func.lower(ThirdPartyDramaResource.source).in_(["reelshort", "reelshort_cps"])
        )
        if resource_id is not None:
            stmt = stmt.where(ThirdPartyDramaResource.id == resource_id)
        else:
            stmt = stmt.where(ThirdPartyDramaResource.import_status != "failed")
        stmt = stmt.order_by(ThirdPartyDramaResource.last_seen_at.desc()).limit(limit)
        return list(self.db.scalars(stmt).all())

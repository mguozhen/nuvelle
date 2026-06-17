from sqlalchemy import case, func, or_, select
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
            import_priority = case(
                (
                    or_(
                        ThirdPartyDramaResource.import_status.is_(None),
                        ThirdPartyDramaResource.import_status == "pending",
                    ),
                    0,
                ),
                else_=1,
            )
            stmt = stmt.where(
                or_(
                    ThirdPartyDramaResource.import_status.is_(None),
                    ThirdPartyDramaResource.import_status != "failed",
                )
            ).order_by(import_priority, ThirdPartyDramaResource.last_seen_at.desc())
        stmt = stmt.limit(limit)
        return list(self.db.scalars(stmt).all())

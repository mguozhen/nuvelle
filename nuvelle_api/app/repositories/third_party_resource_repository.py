from sqlalchemy import case, func, or_, select
from sqlalchemy.orm import Session

from app.models.third_party_resource import ThirdPartyDramaResource


class ThirdPartyResourceRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_reelshort(
        self,
        *,
        limit: int,
        resource_id: int | None = None,
        detail_only: bool = False,
        start_after_resource_id: int | None = None,
    ) -> list[ThirdPartyDramaResource]:
        stmt = select(ThirdPartyDramaResource).where(
            func.lower(ThirdPartyDramaResource.source).in_(["reelshort", "reelshort_cps"])
        )
        if detail_only:
            stmt = stmt.where(ThirdPartyDramaResource.book_type == "1")
        if resource_id is not None:
            stmt = stmt.where(ThirdPartyDramaResource.id == resource_id)
        else:
            if start_after_resource_id is not None:
                stmt = stmt.where(ThirdPartyDramaResource.id > start_after_resource_id)
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
            )
            if start_after_resource_id is not None:
                stmt = stmt.order_by(ThirdPartyDramaResource.id.asc())
            else:
                stmt = stmt.order_by(import_priority, ThirdPartyDramaResource.last_seen_at.desc())
        stmt = stmt.limit(limit)
        return list(self.db.scalars(stmt).all())

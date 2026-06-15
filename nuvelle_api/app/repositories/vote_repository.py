from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.vote import Vote
from app.schemas.vote import VoteCreate, VoteRecord, VotesResponse


class VoteRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, payload: VoteCreate) -> Vote:
        vote = Vote(
            drama_id=str(payload.drama_id),
            taster=payload.taster,
            verdict=payload.verdict,
            score=payload.score,
            tags=payload.tags,
        )
        self.db.add(vote)
        self.db.commit()
        self.db.refresh(vote)
        return vote

    def list_response(self) -> VotesResponse:
        votes = list(self.db.scalars(select(Vote).order_by(Vote.created_at.asc(), Vote.id.asc())).all())
        grouped: dict[str, list[VoteRecord]] = defaultdict(list)
        for vote in votes:
            grouped[vote.drama_id].append(
                VoteRecord(
                    taster=vote.taster,
                    verdict=vote.verdict,
                    tags=vote.tags or [],
                    score=vote.score,
                    ts=vote.created_at.timestamp() if vote.created_at else None,
                )
            )
        return VotesResponse(rated=list(grouped.keys()), votes=dict(grouped), count=len(votes))

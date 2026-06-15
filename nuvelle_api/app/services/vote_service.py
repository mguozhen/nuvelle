from sqlalchemy.orm import Session

from app.repositories.vote_repository import VoteRepository
from app.schemas.vote import VoteCreate, VoteCreateResponse, VotesResponse


class VoteService:
    def __init__(self, db: Session) -> None:
        self.repository = VoteRepository(db)

    def create_vote(self, payload: VoteCreate) -> VoteCreateResponse:
        self.repository.create(payload)
        votes = self.repository.list_response()
        return VoteCreateResponse(ok=True, rated=len(votes.rated))

    def list_votes(self) -> VotesResponse:
        return self.repository.list_response()

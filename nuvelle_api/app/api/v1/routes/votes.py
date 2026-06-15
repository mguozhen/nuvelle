from fastapi import APIRouter

from app.api.deps import DbSession
from app.schemas.vote import VoteCreate, VoteCreateResponse, VotesResponse
from app.services.vote_service import VoteService

router = APIRouter()


@router.get("/votes", response_model=VotesResponse)
def list_votes(db: DbSession) -> VotesResponse:
    return VoteService(db).list_votes()


@router.post("/votes", response_model=VoteCreateResponse)
def create_vote(payload: VoteCreate, db: DbSession) -> VoteCreateResponse:
    return VoteService(db).create_vote(payload)


@router.post("/vote", response_model=VoteCreateResponse)
def create_vote_alias(payload: VoteCreate, db: DbSession) -> VoteCreateResponse:
    return VoteService(db).create_vote(payload)

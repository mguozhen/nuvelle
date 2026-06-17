from fastapi import APIRouter

from app.api.v1.routes import auth, dramas, health, promo, votes

router = APIRouter()
router.include_router(health.router, tags=["health"])
router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(dramas.router, prefix="/dramas", tags=["dramas"])
router.include_router(votes.router, tags=["votes"])
router.include_router(promo.router, tags=["promo"])

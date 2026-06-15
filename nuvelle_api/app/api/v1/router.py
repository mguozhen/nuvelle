from fastapi import APIRouter

from app.api.v1.routes import dramas, health

router = APIRouter()
router.include_router(health.router, tags=["health"])
router.include_router(dramas.router, prefix="/dramas", tags=["dramas"])

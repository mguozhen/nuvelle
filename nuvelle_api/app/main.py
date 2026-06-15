from fastapi import Depends, FastAPI
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db

settings = get_settings()

app = FastAPI(title=settings.app_name)


@app.get("/")
def root() -> dict[str, str]:
    return {"service": "nuvelle-api"}


@app.get("/health")
def health(db: Session = Depends(get_db)) -> dict[str, str]:
    db.execute(text("select 1"))
    return {"ok": "true", "database": "ok"}

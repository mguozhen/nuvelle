from fastapi import FastAPI

from nuvelle_crawler.routes.internal import router as internal_router

app = FastAPI(title="Nuvelle Crawler")
app.include_router(internal_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


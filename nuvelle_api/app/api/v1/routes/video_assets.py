from pathlib import Path, PurePosixPath

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response

from app.core.config import get_settings
from app.storage.object_store import ObjectStorage

router = APIRouter()
settings = get_settings()


@router.get("/video-assets/{object_path:path}")
def video_asset(object_path: str, request: Request) -> Response:
    bucket = (settings.video_gcs_bucket or settings.promo_gcs_bucket).strip()
    if not bucket:
        raise HTTPException(status_code=404, detail="video storage not configured")

    normalized_path = _safe_object_path(object_path)
    prefix = settings.video_gcs_prefix.strip("/")
    if prefix and not normalized_path.startswith(f"{prefix}/"):
        raise HTTPException(status_code=404, detail="video asset not found")

    parent = str(PurePosixPath(normalized_path).parent)
    filename = PurePosixPath(normalized_path).name
    if parent == "." or not filename:
        raise HTTPException(status_code=404, detail="video asset not found")

    storage = ObjectStorage(
        local_dir=Path("/tmp/nuvelle-video-assets"),
        work_dir=Path(settings.video_transfer_work_dir),
        gcs_bucket=bucket,
        gcs_prefix="",
    )
    asset = storage.read_object(
        f"gs://{bucket}/{parent}",
        filename,
        request.headers.get("range"),
    )
    return Response(
        asset.content,
        status_code=asset.status_code,
        media_type=asset.media_type,
        headers=asset.headers,
    )


def _safe_object_path(object_path: str) -> str:
    path = PurePosixPath(object_path)
    if path.is_absolute() or any(part in {"", ".", ".."} for part in path.parts):
        raise HTTPException(status_code=404, detail="video asset not found")
    return str(path)

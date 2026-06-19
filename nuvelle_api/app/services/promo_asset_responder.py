from __future__ import annotations

from fastapi import HTTPException
from fastapi.responses import FileResponse, Response

from app.services.promo_asset_store import PromoAssetStore
from app.services.promo_assets import PROMO_ASSET_NAMES


class PromoAssetResponder:
    def __init__(self, asset_store: PromoAssetStore) -> None:
        self.asset_store = asset_store

    def response_for(self, location: str, filename: str, range_header: str | None = None, download: bool = False) -> Response:
        if filename not in PROMO_ASSET_NAMES:
            raise HTTPException(status_code=404, detail="asset not found")

        path = self.asset_store.local_asset_path(location, filename)
        if path is not None:
            if not path.exists():
                raise HTTPException(status_code=404, detail="asset not found")
            return FileResponse(
                path,
                filename=path.name,
                content_disposition_type="attachment" if download else "inline",
            )

        asset = self.asset_store.read_asset(location, filename, range_header)
        disposition_type = "attachment" if download else "inline"
        return Response(
            asset.content,
            status_code=asset.status_code,
            media_type=asset.media_type,
            headers={
                **asset.headers,
                "Content-Disposition": f'{disposition_type}; filename="{filename}"',
            },
        )

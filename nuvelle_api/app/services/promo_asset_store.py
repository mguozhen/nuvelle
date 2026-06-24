from __future__ import annotations

from collections.abc import Iterable
from pathlib import Path

from app.storage.object_store import ObjectStorage, StoredObject


class PromoAssetStore:
    def __init__(self, settings) -> None:
        self.storage = ObjectStorage(
            local_dir=Path(settings.promo_storage_dir),
            work_dir=Path(settings.promo_work_dir),
            gcs_bucket=settings.promo_gcs_bucket,
            gcs_prefix=settings.promo_gcs_prefix,
        )

    @property
    def gcs_enabled(self) -> bool:
        return self.storage.remote_enabled

    def output_dir_for(self, job_id: str) -> Path:
        return self.storage.output_dir_for(job_id)

    def persist_job_assets(self, *, job_id: str, output_dir: Path, asset_names: Iterable[str]) -> str:
        return self.storage.persist_objects(key=job_id, source_dir=output_dir, object_names=asset_names)

    def cleanup_work_dir(self, output_dir: Path) -> None:
        self.storage.cleanup_work_dir(output_dir)

    def location_for(self, job_id: str) -> str:
        return self.storage.location_for(job_id)

    def location_for_slug(self, slug: str) -> str:
        return self.storage.location_for_slug(slug)

    def exists(self, location: str, filename: str) -> bool:
        return self.storage.exists(location, filename)

    def read_text(self, location: str, filename: str) -> str:
        return self.storage.read_text(location, filename)

    def read_asset(self, location: str, filename: str, range_header: str | None = None) -> StoredObject:
        return self.storage.read_object(location, filename, range_header)

    def local_asset_path(self, location: str, filename: str) -> Path | None:
        return self.storage.local_path(location, filename)

    def signed_download_url(
        self,
        location: str,
        filename: str,
        *,
        download_filename: str,
        expires_in: int,
    ) -> str | None:
        return self.storage.signed_download_url(
            location,
            filename,
            download_filename=download_filename,
            expires_in=expires_in,
        )

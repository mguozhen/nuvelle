from __future__ import annotations

import mimetypes
import shutil
from collections.abc import Iterable
from dataclasses import dataclass
from pathlib import Path

from fastapi import HTTPException


@dataclass(frozen=True)
class StoredAsset:
    content: bytes
    media_type: str
    headers: dict[str, str]
    status_code: int = 200


class PromoAssetStore:
    def __init__(self, settings) -> None:
        self.local_storage_dir = Path(settings.promo_storage_dir).resolve()
        self.work_dir = Path(settings.promo_work_dir).resolve()
        self.bucket_name = settings.promo_gcs_bucket.strip()
        self.prefix = settings.promo_gcs_prefix.strip("/")

    @property
    def gcs_enabled(self) -> bool:
        return bool(self.bucket_name)

    def output_dir_for(self, job_id: str) -> Path:
        base_dir = self.work_dir if self.gcs_enabled else self.local_storage_dir
        return base_dir / job_id

    def persist_job_assets(self, *, job_id: str, output_dir: Path, asset_names: Iterable[str]) -> str:
        if not self.gcs_enabled:
            return str(output_dir)

        bucket = self._bucket()
        for filename in asset_names:
            path = output_dir / filename
            if not path.exists():
                continue
            blob = bucket.blob(self._object_name(job_id, filename))
            blob.upload_from_filename(
                str(path),
                content_type=mimetypes.guess_type(path.name)[0] or "application/octet-stream",
            )
        return self.location_for(job_id)

    def cleanup_work_dir(self, output_dir: Path) -> None:
        if self.gcs_enabled:
            shutil.rmtree(output_dir, ignore_errors=True)

    def location_for(self, job_id: str) -> str:
        return f"gs://{self.bucket_name}/{self._object_prefix(job_id)}"

    def location_for_slug(self, slug: str) -> str:
        if self.gcs_enabled:
            return f"gs://{self.bucket_name}/{self._object_prefix(Path(slug).name)}"
        return str(self.local_storage_dir / Path(slug).name)

    def exists(self, location: str, filename: str) -> bool:
        if self._is_gcs_location(location):
            bucket_name, object_name = self._gcs_asset(location, filename)
            return self._bucket(bucket_name).blob(object_name).exists()
        return (Path(location) / filename).exists()

    def read_text(self, location: str, filename: str) -> str:
        return self.read_asset(location, filename).content.decode("utf-8")

    def read_asset(self, location: str, filename: str, range_header: str | None = None) -> StoredAsset:
        if self._is_gcs_location(location):
            return self._read_gcs_asset(location, filename, range_header)
        return self._read_local_asset(location, filename, range_header)

    def local_asset_path(self, location: str, filename: str) -> Path | None:
        if self._is_gcs_location(location):
            return None
        return Path(location) / filename

    def _read_local_asset(self, location: str, filename: str, range_header: str | None = None) -> StoredAsset:
        path = Path(location) / filename
        if not path.exists():
            raise HTTPException(status_code=404, detail="asset not found")

        size = path.stat().st_size
        byte_range = self._parse_range(range_header, size)
        media_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        headers = {"Accept-Ranges": "bytes"}
        if byte_range is None:
            content = path.read_bytes()
            headers["Content-Length"] = str(len(content))
            return StoredAsset(content=content, media_type=media_type, headers=headers)

        start, end = byte_range
        with path.open("rb") as handle:
            handle.seek(start)
            content = handle.read(end - start + 1)
        headers.update(
            {
                "Content-Range": f"bytes {start}-{end}/{size}",
                "Content-Length": str(len(content)),
            }
        )
        return StoredAsset(content=content, media_type=media_type, headers=headers, status_code=206)

    def _read_gcs_asset(self, location: str, filename: str, range_header: str | None = None) -> StoredAsset:
        bucket_name, object_name = self._gcs_asset(location, filename)
        blob = self._bucket(bucket_name).blob(object_name)
        if not blob.exists():
            raise HTTPException(status_code=404, detail="asset not found")

        blob.reload()
        size = int(blob.size or 0)
        byte_range = self._parse_range(range_header, size)
        media_type = blob.content_type or mimetypes.guess_type(filename)[0] or "application/octet-stream"
        headers = {"Accept-Ranges": "bytes"}
        if byte_range is None:
            content = blob.download_as_bytes()
            headers["Content-Length"] = str(len(content))
            return StoredAsset(content=content, media_type=media_type, headers=headers)

        start, end = byte_range
        content = blob.download_as_bytes(start=start, end=end)
        headers.update(
            {
                "Content-Range": f"bytes {start}-{end}/{size}",
                "Content-Length": str(len(content)),
            }
        )
        return StoredAsset(content=content, media_type=media_type, headers=headers, status_code=206)

    def _bucket(self, bucket_name: str | None = None):
        from google.cloud import storage

        return storage.Client().bucket(bucket_name or self.bucket_name)

    def _object_prefix(self, key: str) -> str:
        key = key.strip("/")
        return f"{self.prefix}/{key}" if self.prefix else key

    def _object_name(self, job_id: str, filename: str) -> str:
        return f"{self._object_prefix(job_id)}/{filename}"

    @staticmethod
    def _is_gcs_location(location: str) -> bool:
        return location.startswith("gs://")

    @staticmethod
    def _gcs_asset(location: str, filename: str) -> tuple[str, str]:
        raw = location.removeprefix("gs://")
        bucket_name, _, prefix = raw.partition("/")
        prefix = prefix.strip("/")
        object_name = f"{prefix}/{filename}" if prefix else filename
        return bucket_name, object_name

    @staticmethod
    def _parse_range(range_header: str | None, size: int) -> tuple[int, int] | None:
        if not range_header or not range_header.startswith("bytes=") or size <= 0:
            return None
        value = range_header.removeprefix("bytes=").strip()
        if "," in value or "-" not in value:
            return None

        start_raw, end_raw = value.split("-", 1)
        try:
            if not start_raw:
                suffix = int(end_raw)
                if suffix <= 0:
                    return None
                return max(size - suffix, 0), size - 1
            start = int(start_raw)
            end = int(end_raw) if end_raw else size - 1
        except ValueError:
            return None

        if start < 0 or start >= size:
            raise HTTPException(
                status_code=416,
                detail="range not satisfiable",
                headers={"Content-Range": f"bytes */{size}"},
            )
        return start, min(end, size - 1)

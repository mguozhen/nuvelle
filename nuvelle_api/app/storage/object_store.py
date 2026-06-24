from __future__ import annotations

import mimetypes
import shutil
from collections.abc import Iterable
from dataclasses import dataclass
from datetime import timedelta
from pathlib import Path
from typing import Protocol

from fastapi import HTTPException


@dataclass(frozen=True)
class StoredObject:
    content: bytes
    media_type: str
    headers: dict[str, str]
    status_code: int = 200


class ObjectStorageBackend(Protocol):
    def output_dir_for(self, key: str) -> Path: ...

    def persist_objects(self, *, key: str, source_dir: Path, object_names: Iterable[str]) -> str: ...

    def cleanup_work_dir(self, output_dir: Path) -> None: ...

    def location_for(self, key: str) -> str: ...

    def location_for_slug(self, slug: str) -> str: ...

    def exists(self, location: str, object_name: str) -> bool: ...

    def read_object(
        self,
        location: str,
        object_name: str,
        range_header: str | None = None,
    ) -> StoredObject: ...

    def local_path(self, location: str, object_name: str) -> Path | None: ...

    def signed_download_url(
        self,
        location: str,
        object_name: str,
        *,
        download_filename: str,
        expires_in: int,
    ) -> str | None: ...


class ObjectStorage:
    def __init__(
        self,
        *,
        local_dir: Path,
        work_dir: Path,
        gcs_bucket: str = "",
        gcs_prefix: str = "",
    ) -> None:
        bucket_name = gcs_bucket.strip()
        self.local_backend = LocalObjectStorageBackend(local_dir.resolve())
        self.gcs_backend = GcsObjectStorageBackend(
            bucket_name=bucket_name,
            prefix=gcs_prefix,
            work_dir=work_dir.resolve(),
        )
        self.writer_backend: ObjectStorageBackend = self.gcs_backend if bucket_name else self.local_backend

    @property
    def remote_enabled(self) -> bool:
        return self.writer_backend is self.gcs_backend

    def output_dir_for(self, key: str) -> Path:
        return self.writer_backend.output_dir_for(key)

    def persist_objects(self, *, key: str, source_dir: Path, object_names: Iterable[str]) -> str:
        return self.writer_backend.persist_objects(key=key, source_dir=source_dir, object_names=object_names)

    def cleanup_work_dir(self, output_dir: Path) -> None:
        self.writer_backend.cleanup_work_dir(output_dir)

    def location_for(self, key: str) -> str:
        return self.writer_backend.location_for(key)

    def location_for_slug(self, slug: str) -> str:
        return self.writer_backend.location_for_slug(slug)

    def exists(self, location: str, object_name: str) -> bool:
        return self._backend_for_location(location).exists(location, object_name)

    def read_text(self, location: str, object_name: str) -> str:
        return self.read_object(location, object_name).content.decode("utf-8")

    def read_object(self, location: str, object_name: str, range_header: str | None = None) -> StoredObject:
        return self._backend_for_location(location).read_object(location, object_name, range_header)

    def local_path(self, location: str, object_name: str) -> Path | None:
        return self._backend_for_location(location).local_path(location, object_name)

    def signed_download_url(
        self,
        location: str,
        object_name: str,
        *,
        download_filename: str,
        expires_in: int,
    ) -> str | None:
        return self._backend_for_location(location).signed_download_url(
            location,
            object_name,
            download_filename=download_filename,
            expires_in=expires_in,
        )

    def _backend_for_location(self, location: str) -> ObjectStorageBackend:
        return self.gcs_backend if is_gcs_uri(location) else self.local_backend


class LocalObjectStorageBackend:
    def __init__(self, storage_dir: Path) -> None:
        self.storage_dir = storage_dir

    def output_dir_for(self, key: str) -> Path:
        return self.storage_dir / key

    def persist_objects(self, *, key: str, source_dir: Path, object_names: Iterable[str]) -> str:
        return str(source_dir)

    def cleanup_work_dir(self, output_dir: Path) -> None:
        return None

    def location_for(self, key: str) -> str:
        return str(self.storage_dir / Path(key).name)

    def location_for_slug(self, slug: str) -> str:
        return self.location_for(slug)

    def exists(self, location: str, object_name: str) -> bool:
        return (Path(location) / object_name).exists()

    def read_object(self, location: str, object_name: str, range_header: str | None = None) -> StoredObject:
        path = Path(location) / object_name
        if not path.exists():
            raise HTTPException(status_code=404, detail="asset not found")

        size = path.stat().st_size
        byte_range = parse_range_header(range_header, size)
        media_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        headers = {"Accept-Ranges": "bytes"}
        if byte_range is None:
            content = path.read_bytes()
            headers["Content-Length"] = str(len(content))
            return StoredObject(content=content, media_type=media_type, headers=headers)

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
        return StoredObject(content=content, media_type=media_type, headers=headers, status_code=206)

    def local_path(self, location: str, object_name: str) -> Path | None:
        return Path(location) / object_name

    def signed_download_url(
        self,
        location: str,
        object_name: str,
        *,
        download_filename: str,
        expires_in: int,
    ) -> str | None:
        return None


class GcsObjectStorageBackend:
    def __init__(self, *, bucket_name: str, prefix: str, work_dir: Path) -> None:
        self.bucket_name = bucket_name
        self.prefix = prefix.strip("/")
        self.work_dir = work_dir

    def output_dir_for(self, key: str) -> Path:
        return self.work_dir / key

    def persist_objects(self, *, key: str, source_dir: Path, object_names: Iterable[str]) -> str:
        bucket = self._bucket()
        for object_name in object_names:
            path = source_dir / object_name
            if not path.exists():
                continue
            blob = bucket.blob(self._object_name(key, object_name))
            blob.upload_from_filename(
                str(path),
                content_type=mimetypes.guess_type(path.name)[0] or "application/octet-stream",
            )
        return self.location_for(key)

    def cleanup_work_dir(self, output_dir: Path) -> None:
        shutil.rmtree(output_dir, ignore_errors=True)

    def location_for(self, key: str) -> str:
        return f"gs://{self.bucket_name}/{self._object_prefix(key)}"

    def location_for_slug(self, slug: str) -> str:
        return self.location_for(Path(slug).name)

    def exists(self, location: str, object_name: str) -> bool:
        bucket_name, full_object_name = gcs_object_name(location, object_name)
        return self._bucket(bucket_name).blob(full_object_name).exists()

    def read_object(self, location: str, object_name: str, range_header: str | None = None) -> StoredObject:
        bucket_name, full_object_name = gcs_object_name(location, object_name)
        blob = self._bucket(bucket_name).blob(full_object_name)
        if not blob.exists():
            raise HTTPException(status_code=404, detail="asset not found")

        blob.reload()
        size = int(blob.size or 0)
        byte_range = parse_range_header(range_header, size)
        media_type = blob.content_type or mimetypes.guess_type(object_name)[0] or "application/octet-stream"
        headers = {"Accept-Ranges": "bytes"}
        if byte_range is None:
            content = blob.download_as_bytes()
            headers["Content-Length"] = str(len(content))
            return StoredObject(content=content, media_type=media_type, headers=headers)

        start, end = byte_range
        content = blob.download_as_bytes(start=start, end=end)
        headers.update(
            {
                "Content-Range": f"bytes {start}-{end}/{size}",
                "Content-Length": str(len(content)),
            }
        )
        return StoredObject(content=content, media_type=media_type, headers=headers, status_code=206)

    def local_path(self, location: str, object_name: str) -> Path | None:
        return None

    def signed_download_url(
        self,
        location: str,
        object_name: str,
        *,
        download_filename: str,
        expires_in: int,
    ) -> str | None:
        bucket_name, full_object_name = gcs_object_name(location, object_name)
        full_object_name = full_object_name.strip("/")
        if not bucket_name or not full_object_name:
            return None

        blob = self._bucket(bucket_name).blob(full_object_name)
        kwargs = self._signed_url_kwargs(download_filename=download_filename, expires_in=expires_in)
        try:
            return blob.generate_signed_url(**kwargs)
        except AttributeError as exc:
            if "private key" not in str(exc):
                raise

            signing_identity = self._iam_signing_identity()
            if signing_identity is None:
                raise

            service_account_email, access_token = signing_identity
            return blob.generate_signed_url(
                **kwargs,
                service_account_email=service_account_email,
                access_token=access_token,
            )

    def _signed_url_kwargs(self, *, download_filename: str, expires_in: int) -> dict[str, object]:
        return {
            "version": "v4",
            "expiration": timedelta(seconds=max(1, expires_in)),
            "method": "GET",
            "response_disposition": (
                f'attachment; filename="{safe_content_disposition_filename(download_filename)}"'
            ),
        }

    def _iam_signing_identity(self) -> tuple[str, str] | None:
        import google.auth
        from google.auth.compute_engine import _metadata
        from google.auth.transport.requests import Request

        request = Request()
        credentials, _project_id = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
        if not getattr(credentials, "token", None):
            credentials.refresh(request)

        service_account_email = getattr(credentials, "service_account_email", None)
        if not service_account_email or "@" not in service_account_email:
            service_account_info = _metadata.get_service_account_info(request, service_account="default")
            service_account_email = service_account_info.get("email")

        access_token = getattr(credentials, "token", None)
        if not service_account_email or not access_token:
            return None

        return service_account_email, access_token

    def _bucket(self, bucket_name: str | None = None):
        from google.cloud import storage

        return storage.Client().bucket(bucket_name or self.bucket_name)

    def _object_prefix(self, key: str) -> str:
        key = key.strip("/")
        return f"{self.prefix}/{key}" if self.prefix else key

    def _object_name(self, key: str, object_name: str) -> str:
        return f"{self._object_prefix(key)}/{object_name}"


def is_gcs_uri(location: str) -> bool:
    return location.startswith("gs://")


def gcs_object_name(location: str, object_name: str) -> tuple[str, str]:
    raw = location.removeprefix("gs://")
    bucket_name, _, prefix = raw.partition("/")
    prefix = prefix.strip("/")
    object_name = object_name.strip("/")
    if object_name:
        full_object_name = f"{prefix}/{object_name}" if prefix else object_name
    else:
        full_object_name = prefix
    return bucket_name, full_object_name


def safe_content_disposition_filename(filename: str) -> str:
    cleaned = filename.replace("\\", "_").replace('"', "'").replace("\r", " ").replace("\n", " ").strip()
    return cleaned or "download"


def parse_range_header(range_header: str | None, size: int) -> tuple[int, int] | None:
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

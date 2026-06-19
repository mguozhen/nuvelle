from app.storage.object_store import ObjectStorage, StoredObject


def object_storage(tmp_path, *, bucket: str = "") -> ObjectStorage:
    return ObjectStorage(
        local_dir=tmp_path / "storage",
        work_dir=tmp_path / "work",
        gcs_bucket=bucket,
        gcs_prefix="promo",
    )


def test_object_storage_reads_local_objects_with_range(tmp_path) -> None:
    storage = object_storage(tmp_path)
    output_dir = storage.output_dir_for("job-1")
    output_dir.mkdir(parents=True)
    (output_dir / "teaser.mp4").write_bytes(b"abcdef")

    stored_object = storage.read_object(str(output_dir), "teaser.mp4", "bytes=1-3")

    assert stored_object.status_code == 206
    assert stored_object.content == b"bcd"
    assert stored_object.headers["Content-Range"] == "bytes 1-3/6"
    assert storage.local_path(str(output_dir), "teaser.mp4") == output_dir / "teaser.mp4"


def test_object_storage_uses_gcs_backend_for_configured_writes(tmp_path) -> None:
    storage = object_storage(tmp_path, bucket="promo-assets")

    assert storage.remote_enabled is True
    assert storage.output_dir_for("job-1") == (tmp_path / "work" / "job-1").resolve()
    assert storage.location_for("job-1") == "gs://promo-assets/promo/job-1"
    assert storage.location_for_slug("../job-1") == "gs://promo-assets/promo/job-1"


def test_object_storage_routes_gcs_locations_to_gcs_backend(tmp_path) -> None:
    storage = object_storage(tmp_path)
    seen: list[tuple[str, str, str | None]] = []

    class FakeGcsBackend:
        def read_object(self, location, object_name, range_header=None):
            seen.append((location, object_name, range_header))
            return StoredObject(content=b"asset", media_type="video/mp4", headers={})

    storage.gcs_backend = FakeGcsBackend()

    stored_object = storage.read_object("gs://bucket/promo/job-1", "teaser.mp4", "bytes=0-1")

    assert stored_object.content == b"asset"
    assert seen == [("gs://bucket/promo/job-1", "teaser.mp4", "bytes=0-1")]

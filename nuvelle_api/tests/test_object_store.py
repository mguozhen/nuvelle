from app.storage.object_store import GcsObjectStorageBackend, ObjectStorage, StoredObject


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


def test_gcs_signed_url_falls_back_to_iam_signing_identity(monkeypatch, tmp_path) -> None:
    backend = GcsObjectStorageBackend(bucket_name="promo-assets", prefix="promo", work_dir=tmp_path)
    calls: list[dict[str, object]] = []

    class FakeBlob:
        def generate_signed_url(self, **kwargs):
            calls.append(kwargs)
            if len(calls) == 1:
                raise AttributeError("you need a private key to sign credentials")
            return "https://storage.example/signed"

    class FakeBucket:
        def blob(self, object_name):
            assert object_name == "videos/drama-1/ep-1.mp4"
            return FakeBlob()

    monkeypatch.setattr(backend, "_bucket", lambda bucket_name=None: FakeBucket())
    monkeypatch.setattr(
        backend,
        "_iam_signing_identity",
        lambda: ("runtime@example.iam.gserviceaccount.com", "token-1"),
        raising=False,
    )

    url = backend.signed_download_url(
        "gs://promo-assets/videos/drama-1/ep-1.mp4",
        "",
        download_filename="Demo-ep-1.mp4",
        expires_in=600,
    )

    assert url == "https://storage.example/signed"
    assert "access_token" not in calls[0]
    assert calls[1]["access_token"] == "token-1"
    assert calls[1]["service_account_email"] == "runtime@example.iam.gserviceaccount.com"

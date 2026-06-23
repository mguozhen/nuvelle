from pathlib import Path
from types import SimpleNamespace

import pytest

from app.services.reelshort_video_transfer_service import GcsVideoEpisodeStore


def test_gcs_video_episode_store_requires_public_cdn_base_url() -> None:
    settings = SimpleNamespace(
        video_gcs_bucket="video-bucket",
        promo_gcs_bucket="",
        video_gcs_prefix="videos",
        video_public_base_url="",
        video_transfer_work_dir="/tmp/nuvelle-video-transfer-test",
    )

    with pytest.raises(RuntimeError, match="VIDEO_PUBLIC_BASE_URL"):
        GcsVideoEpisodeStore(settings)


def test_deploy_script_does_not_fallback_to_video_asset_api_proxy() -> None:
    repo_root = Path(__file__).resolve().parents[2]
    deploy_script = (repo_root / "deploy" / "google-cloud.sh").read_text()

    assert "/api/v1/video-assets" not in deploy_script

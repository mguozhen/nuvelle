from pathlib import Path


def test_package_exposes_generation_request_and_slug_helpers() -> None:
    from nuvelle_kit.schemas import PromoGenerationRequest
    from nuvelle_kit.storage import default_output_dir, slugify

    request = PromoGenerationRequest(mp4=Path("episode.mp4"), title="MY WIFE!!", episode="3")

    assert slugify("MY WIFE!!") == "my_wife"
    assert request.slug == "my_wife_e3"
    assert default_output_dir(Path("/tmp/out"), request) == Path("/tmp/out/my_wife_e3")


def test_cli_delegates_to_shared_generate_promo(monkeypatch, tmp_path) -> None:
    from nuvelle_kit import cli
    from nuvelle_kit.schemas import PromoGenerationResult

    captured = {}

    def fake_generate_promo(request):
        captured["request"] = request
        return PromoGenerationResult(
            output_dir=tmp_path,
            cover_path=tmp_path / "cover.jpg",
            teaser_path=tmp_path / "teaser.mp4",
            caption_path=tmp_path / "caption.txt",
            plan_path=tmp_path / "plan.json",
            caption_text="caption",
        )

    monkeypatch.setattr(cli, "generate_promo", fake_generate_promo)

    exit_code = cli.main(
        [
            "episode.mp4",
            "--title",
            "MY WIFE",
            "--ep",
            "2",
            "--sub",
            "The 1 AM Tragedy",
            "--dur",
            "15",
            "--beats",
            "10,20,30",
            "--cover-ts",
            "8.5",
            "--no-ai",
        ]
    )

    request = captured["request"]
    assert exit_code == 0
    assert request.mp4 == Path("episode.mp4")
    assert request.title == "MY WIFE"
    assert request.episode == "2"
    assert request.subtitle == "The 1 AM Tragedy"
    assert request.duration == 15
    assert request.beats == [10.0, 20.0, 30.0]
    assert request.cover_ts == 8.5
    assert request.no_ai is True

import argparse
from pathlib import Path

from .schemas import PromoGenerationRequest


def generate_promo(request: PromoGenerationRequest):
    from .promo_generator import generate_promo as run_generation

    return run_generation(request)


def parse_beats(value: str | None) -> list[float] | None:
    if not value:
        return None
    return [float(item) for item in value.split(",") if item.strip()]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("mp4")
    parser.add_argument("--title", required=True)
    parser.add_argument("--ep", default="1")
    parser.add_argument("--sub", default="")
    parser.add_argument("--handle", default="@nuvelle")
    parser.add_argument("--genre", default="Short Drama")
    parser.add_argument("--out", default=None)
    parser.add_argument("--cover-ts", type=float, default=None)
    parser.add_argument("--beats", default=None, help="comma ts, e.g. 24,83,95,107")
    parser.add_argument("--no-ai", action="store_true")
    parser.add_argument("--plan", default=None, help="reuse a saved plan.json (skips AI)")
    parser.add_argument("--dur", type=int, default=13, help="teaser length in seconds (default 13)")
    parser.add_argument("--music", default=None, help="BGM track")
    parser.add_argument("--prompt", default="", help="reviewer creative direction to steer the AI")
    parser.add_argument("--cover-image", default="", help="use this existing cover image URL")
    args = parser.parse_args(argv)

    generate_promo(
        PromoGenerationRequest(
            mp4=Path(args.mp4),
            title=args.title,
            episode=str(args.ep),
            subtitle=args.sub,
            handle=args.handle,
            genre=args.genre,
            output_dir=Path(args.out) if args.out else None,
            cover_ts=args.cover_ts,
            beats=parse_beats(args.beats),
            no_ai=args.no_ai,
            plan_path=Path(args.plan) if args.plan else None,
            duration=args.dur,
            music_path=Path(args.music) if args.music else None,
            prompt=args.prompt,
            cover_image_url=args.cover_image,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

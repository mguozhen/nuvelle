from __future__ import annotations

import argparse
import json
import sys
from collections.abc import Sequence
from typing import TextIO

from app.db.session import SessionLocal
from app.services.video_play_url_rewrite_service import (
    VideoPlayUrlRewriteRequest,
    VideoPlayUrlRewriteResponse,
    VideoPlayUrlRewriteService,
)


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Rewrite transferred episode playback URLs from gcs_uri and VIDEO_PUBLIC_BASE_URL.",
    )
    parser.add_argument("--limit", type=int, default=500, help="Maximum dramas to scan in this run.")
    parser.add_argument("--platform", default="reelshort", help="Drama platform filter.")
    parser.add_argument("--language", default="English", help="Drama language filter.")
    parser.add_argument("--drama-id", type=int, default=None, help="Rewrite one drama by internal id.")
    parser.add_argument(
        "--start-after-drama-id",
        type=int,
        default=None,
        help="Keyset pagination cursor for batch runs.",
    )
    parser.add_argument("--public-base-url", default=None, help="Override VIDEO_PUBLIC_BASE_URL.")
    parser.add_argument("--dry-run", action="store_true", help="Report changes without writing.")
    parser.add_argument("--write", action="store_true", help="Write URL changes to the database.")
    parser.add_argument("--pretty", action="store_true", help="Print formatted JSON output.")
    return parser.parse_args(argv)


def request_from_args(args: argparse.Namespace) -> VideoPlayUrlRewriteRequest:
    if args.dry_run and args.write:
        raise ValueError("--dry-run and --write cannot be combined")
    return VideoPlayUrlRewriteRequest(
        limit=args.limit,
        platform=args.platform,
        language=args.language,
        drama_id=args.drama_id,
        start_after_drama_id=args.start_after_drama_id,
        public_base_url=args.public_base_url,
        dry_run=not args.write,
    )


def run_once(args: argparse.Namespace) -> VideoPlayUrlRewriteResponse:
    db = SessionLocal()
    try:
        return VideoPlayUrlRewriteService(db).run(request_from_args(args))
    finally:
        db.close()


def run(argv: Sequence[str] | None = None, *, output: TextIO = sys.stdout) -> int:
    args = parse_args(argv)
    result = run_once(args)
    output.write(json.dumps(result.model_dump(), ensure_ascii=False, indent=2 if args.pretty else None))
    output.write("\n")
    return 0


def main() -> None:
    raise SystemExit(run())


if __name__ == "__main__":
    main()

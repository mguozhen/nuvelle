from __future__ import annotations

import argparse
import json
import sys
from collections.abc import Sequence
from typing import TextIO

from app.db.session import SessionLocal
from app.services.reelshort_video_transfer_service import (
    ReelShortVideoTransferRequest,
    ReelShortVideoTransferResponse,
    ReelShortVideoTransferService,
)


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Refresh ReelShort episode URLs and transfer videos and cover images into GCS.",
    )
    parser.add_argument("--limit", type=int, default=500, help="Maximum dramas to scan in this run.")
    parser.add_argument("--language", default="English", help="Drama language to transfer.")
    parser.add_argument("--drama-id", type=int, default=None, help="Transfer one drama by internal id.")
    parser.add_argument(
        "--start-after-drama-id",
        type=int,
        default=None,
        help="Keyset pagination cursor for batch runs.",
    )
    parser.add_argument("--retry-failed", action="store_true", help="Only retry failed or partial dramas.")
    parser.add_argument("--force", action="store_true", help="Re-transfer dramas even if already completed.")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Plan without downloading or uploading videos.",
    )
    parser.add_argument("--delay-seconds", type=float, default=0.0, help="Delay between drama transfers.")
    parser.add_argument("--pretty", action="store_true", help="Print formatted JSON output.")
    return parser.parse_args(argv)


def request_from_args(args: argparse.Namespace) -> ReelShortVideoTransferRequest:
    return ReelShortVideoTransferRequest(
        limit=args.limit,
        language=args.language,
        drama_id=args.drama_id,
        start_after_drama_id=args.start_after_drama_id,
        retry_failed=args.retry_failed,
        force=args.force,
        dry_run=args.dry_run,
        delay_seconds=args.delay_seconds,
    )


def run_once(args: argparse.Namespace) -> ReelShortVideoTransferResponse:
    db = SessionLocal()
    try:
        return ReelShortVideoTransferService(db).run(request_from_args(args))
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

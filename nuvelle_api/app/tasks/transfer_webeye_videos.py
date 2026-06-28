from __future__ import annotations

import argparse
import json
import sys
from collections.abc import Sequence
from typing import TextIO

from app.db.session import SessionLocal
from app.services.webeye_video_transfer_pipeline import (
    WebeyeVideoTransferPipeline,
    WebeyeVideoTransferRequest,
    WebeyeVideoTransferResponse,
)


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Download Webeye videos through bdpan, upload them to GCS, and update episodes.",
    )
    parser.add_argument("--limit", type=int, default=10, help="Maximum dramas to process.")
    parser.add_argument("--drama-id", type=int, default=None, help="Process one Webeye drama by internal id.")
    parser.add_argument(
        "--start-after-drama-id", type=int, default=None, help="Only scan dramas with a higher id."
    )
    parser.add_argument(
        "--retry-failed", action="store_true", help="Only retry failed or partially failed dramas."
    )
    parser.add_argument(
        "--force", action="store_true", help="Re-download and re-upload already transferred dramas."
    )
    parser.add_argument("--dry-run", action="store_true", help="List candidates without bdpan/GCS/DB writes.")
    parser.add_argument(
        "--work-dir", default="/tmp/nuvelle_webeye_videos", help="Local temporary download root."
    )
    parser.add_argument("--bdpan-transfer-root", default="/apps/bdpan", help="bdpan app-scope transfer root.")
    parser.add_argument(
        "--keep-local", action="store_true", help="Do not delete local downloaded files after upload."
    )
    parser.add_argument(
        "--keep-remote", action="store_true", help="Do not delete bdpan temporary transfer folders."
    )
    parser.add_argument("--delay-seconds", type=float, default=0.0, help="Delay between dramas.")
    parser.add_argument("--pretty", action="store_true", help="Print formatted JSON output.")
    return parser.parse_args(argv)


def request_from_args(args: argparse.Namespace) -> WebeyeVideoTransferRequest:
    return WebeyeVideoTransferRequest(
        limit=args.limit,
        drama_id=args.drama_id,
        start_after_drama_id=args.start_after_drama_id,
        retry_failed=args.retry_failed,
        force=args.force,
        dry_run=args.dry_run,
        work_dir=args.work_dir,
        bdpan_transfer_root=args.bdpan_transfer_root,
        keep_local=args.keep_local,
        cleanup_remote=not args.keep_remote,
        delay_seconds=args.delay_seconds,
    )


def run_once(args: argparse.Namespace) -> WebeyeVideoTransferResponse:
    db = SessionLocal()
    try:
        return WebeyeVideoTransferPipeline(db).run(request_from_args(args))
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

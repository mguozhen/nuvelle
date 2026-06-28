from __future__ import annotations

import argparse
import json
import sys
from collections.abc import Sequence
from typing import TextIO

from app.db.session import SessionLocal
from app.services.webeye_video_upload_service import (
    WebeyeVideoUploadRequest,
    WebeyeVideoUploadResponse,
    WebeyeVideoUploadService,
)


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Upload Webeye video files to GCS and mark production dramas as transferred.",
    )
    parser.add_argument("--manifest", default=None, help="CSV with drama_id,path columns.")
    parser.add_argument("--drama-id", type=int, default=None, help="Upload one Webeye drama by internal id.")
    parser.add_argument("--episode-no", type=int, default=1, help="Episode number for --drama-id/--file.")
    parser.add_argument("--file", dest="file_path", default=None, help="Video file for --drama-id.")
    parser.add_argument(
        "--source-path", default=None, help="Temporary source path, for example /apps/bdpan/file.mp4."
    )
    parser.add_argument("--source-file-name", default=None, help="Temporary source filename.")
    parser.add_argument("--limit", type=int, default=500, help="Maximum manifest rows to process.")
    parser.add_argument(
        "--force", action="store_true", help="Re-upload/update rows already marked with a GCS URI."
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="Validate inputs without uploading or writing."
    )
    parser.add_argument("--pretty", action="store_true", help="Print formatted JSON output.")
    return parser.parse_args(argv)


def request_from_args(args: argparse.Namespace) -> WebeyeVideoUploadRequest:
    return WebeyeVideoUploadRequest(
        manifest_path=args.manifest,
        drama_id=args.drama_id,
        episode_no=args.episode_no,
        file_path=args.file_path,
        source_path=args.source_path,
        source_file_name=args.source_file_name,
        limit=args.limit,
        force=args.force,
        dry_run=args.dry_run,
    )


def run_once(args: argparse.Namespace) -> WebeyeVideoUploadResponse:
    db = SessionLocal()
    try:
        return WebeyeVideoUploadService(db).run(request_from_args(args))
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

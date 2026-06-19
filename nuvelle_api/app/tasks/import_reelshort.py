from __future__ import annotations

import argparse
import json
import sys
from collections.abc import Sequence
from typing import TextIO

from app.db.session import SessionLocal
from app.schemas.admin import ReelShortSyncRequest
from app.services.reelshort_import_service import ReelShortImportService


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Import ReelShort crawler resources into Nuvelle dramas and episodes.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=50,
        help="Maximum third-party resources to scan in this run.",
    )
    parser.add_argument(
        "--resource-id",
        type=int,
        default=None,
        help="Import one third-party resource by internal id.",
    )
    parser.add_argument(
        "--detail-only",
        action="store_true",
        help="Only scan ReelShort detail resources, currently book_type=1.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Build the import plan without writing dramas or episodes.",
    )
    parser.add_argument("--pretty", action="store_true", help="Print formatted JSON output.")
    return parser.parse_args(argv)


def payload_from_args(args: argparse.Namespace) -> ReelShortSyncRequest:
    return ReelShortSyncRequest(
        resource_id=args.resource_id,
        limit=args.limit,
        detail_only=args.detail_only,
        dry_run=args.dry_run,
    )


def run(argv: Sequence[str] | None = None, *, output: TextIO = sys.stdout) -> int:
    args = parse_args(argv)
    db = SessionLocal()
    try:
        result = ReelShortImportService(db).sync(payload_from_args(args))
    finally:
        db.close()

    output.write(json.dumps(result.model_dump(), ensure_ascii=False, indent=2 if args.pretty else None))
    output.write("\n")
    return 0


def main() -> None:
    raise SystemExit(run())


if __name__ == "__main__":
    main()

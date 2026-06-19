from __future__ import annotations

import argparse
import json
import sys
from collections.abc import Sequence
from typing import TextIO

from app.db.session import SessionLocal
from app.schemas.admin import ReelShortSyncRequest, ReelShortSyncResponse
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
        "--all-matching",
        action="store_true",
        help="Keep scanning matching resources in batches using resource id keyset paging.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Build the import plan without writing dramas or episodes.",
    )
    parser.add_argument("--pretty", action="store_true", help="Print formatted JSON output.")
    return parser.parse_args(argv)


def payload_from_args(
    args: argparse.Namespace,
    *,
    start_after_resource_id: int | None = None,
) -> ReelShortSyncRequest:
    return ReelShortSyncRequest(
        resource_id=args.resource_id,
        limit=args.limit,
        detail_only=args.detail_only,
        start_after_resource_id=start_after_resource_id,
        dry_run=args.dry_run,
    )


def merge_response(total: ReelShortSyncResponse, batch: ReelShortSyncResponse) -> None:
    total.scanned += batch.scanned
    total.imported += batch.imported
    total.updated += batch.updated
    total.skipped += batch.skipped
    total.failed += batch.failed
    total.last_resource_id = batch.last_resource_id or total.last_resource_id


def run_once(
    args: argparse.Namespace,
    *,
    start_after_resource_id: int | None = None,
) -> ReelShortSyncResponse:
    db = SessionLocal()
    try:
        return ReelShortImportService(db).sync(
            payload_from_args(args, start_after_resource_id=start_after_resource_id)
        )
    finally:
        db.close()


def run(argv: Sequence[str] | None = None, *, output: TextIO = sys.stdout) -> int:
    args = parse_args(argv)
    if args.all_matching and args.resource_id is not None:
        raise ValueError("--all-matching cannot be combined with --resource-id")

    result = ReelShortSyncResponse()
    start_after_resource_id: int | None = None
    while True:
        batch = run_once(args, start_after_resource_id=start_after_resource_id)
        merge_response(result, batch)
        if not args.all_matching or batch.scanned < args.limit or batch.last_resource_id is None:
            break
        start_after_resource_id = batch.last_resource_id

    output.write(json.dumps(result.model_dump(), ensure_ascii=False, indent=2 if args.pretty else None))
    output.write("\n")
    return 0


def main() -> None:
    raise SystemExit(run())


if __name__ == "__main__":
    main()

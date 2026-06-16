import argparse
import json
import sys

from nuvelle_crawler.config import get_settings
from nuvelle_crawler.db.models import Base
from nuvelle_crawler.db.session import SessionLocal, engine
from nuvelle_crawler.services.backfill import LocalDramaBackfillService
from nuvelle_crawler.services.planner import CrawlerPlanner
from nuvelle_crawler.sources.config import get_source_config
from nuvelle_crawler.sources.registry import get_adapter
from nuvelle_crawler.tasks.enqueuer import InMemoryTaskEnqueuer


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)

    plan = subparsers.add_parser("plan-incremental")
    plan.add_argument("--source", default="reelshort_cps")
    plan.add_argument("--pages", type=int, default=3)
    plan.add_argument("--language", action="append")
    plan.add_argument("--sort", action="append")

    backfill = subparsers.add_parser("backfill")
    backfill.add_argument("--source", default="reelshort_cps")
    backfill.add_argument("--language", action="append")
    backfill.add_argument("--all-languages", action="store_true")
    backfill.add_argument("--sort", action="append")
    backfill.add_argument("--start-page", type=int, default=1)
    backfill.add_argument("--max-pages", type=int, default=1)
    backfill.add_argument("--no-page-limit", action="store_true")
    backfill.add_argument("--delay-seconds", type=float, default=3.0)
    backfill.add_argument("--with-details", action="store_true")
    backfill.add_argument("--detail-retries", type=int, default=2)
    backfill.add_argument("--fail-fast-detail-errors", action="store_true")
    backfill.add_argument("--create-tables", action="store_true")
    backfill.add_argument("--confirm-live", action="store_true")

    args = parser.parse_args(argv)
    if args.command == "plan-incremental":
        enqueuer = InMemoryTaskEnqueuer(service_url=get_settings().crawler_base_url)
        planner = CrawlerPlanner(enqueuer=enqueuer, service_url=get_settings().crawler_base_url)
        count = planner.plan_incremental(
            source=args.source,
            languages=args.language,
            sorts=args.sort,
            pages=args.pages,
        )
        for task in enqueuer.tasks:
            print(task)
        print(f"planned={count}")
        return 0
    if args.command == "backfill":
        if not args.confirm_live:
            parser.error("backfill sends live source requests; pass --confirm-live to run it")
        if args.no_page_limit and args.max_pages != 1:
            parser.error("--max-pages cannot be combined with --no-page-limit")
        config = get_source_config(args.source)
        languages = list(config["languages"]) if args.all_languages else args.language or list(
            config.get("default_languages", ["en"])
        )
        sorts = args.sort or list(config.get("default_sorts", ["time"]))
        max_pages = None if args.no_page_limit else args.max_pages
        if args.create_tables:
            Base.metadata.create_all(bind=engine)

        db = SessionLocal()
        try:
            service = LocalDramaBackfillService(
                db=db,
                adapter=get_adapter(args.source),
                reporter=lambda message: print(message, file=sys.stderr, flush=True),
            )
            summary = service.run(
                source=args.source,
                languages=languages,
                sorts=sorts,
                start_page=args.start_page,
                max_pages=max_pages,
                delay_seconds=args.delay_seconds,
                with_details=args.with_details,
                detail_retry_attempts=args.detail_retries,
                continue_on_detail_error=not args.fail_fast_detail_errors,
            )
            print(json.dumps(summary.__dict__, ensure_ascii=False, sort_keys=True))
            return 0
        finally:
            db.close()
    return 1


if __name__ == "__main__":
    raise SystemExit(main())

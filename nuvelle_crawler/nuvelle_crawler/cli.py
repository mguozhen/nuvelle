import argparse

from nuvelle_crawler.config import get_settings
from nuvelle_crawler.services.planner import CrawlerPlanner
from nuvelle_crawler.tasks.enqueuer import InMemoryTaskEnqueuer


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)

    plan = subparsers.add_parser("plan-incremental")
    plan.add_argument("--source", default="reelshort_cps")
    plan.add_argument("--pages", type=int, default=3)
    plan.add_argument("--language", action="append")
    plan.add_argument("--sort", action="append")

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
    return 1


if __name__ == "__main__":
    raise SystemExit(main())


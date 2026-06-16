from nuvelle_crawler.sources.config import get_source_config
from nuvelle_crawler.tasks.enqueuer import TaskEnqueuer


class CrawlerPlanner:
    def __init__(self, *, enqueuer: TaskEnqueuer, service_url: str) -> None:
        self.enqueuer = enqueuer
        self.service_url = service_url.rstrip("/")

    def plan_incremental(
        self,
        *,
        source: str,
        languages: list[str] | None = None,
        sorts: list[str] | None = None,
        pages: int = 3,
    ) -> int:
        config = get_source_config(source)
        selected_languages = languages or list(config["languages"])
        selected_sorts = sorts or list(config["sorts"])
        queue = config["queues"]["list"]
        count = 0
        for language in selected_languages:
            for sort in selected_sorts:
                for page in range(1, pages + 1):
                    self.enqueuer.enqueue(
                        queue=queue,
                        path="/internal/tasks/list-page",
                        payload={"source": source, "language": language, "sort": sort, "page": page},
                    )
                    count += 1
        return count

    def enqueue_detail(self, *, source: str, external_id: str, book_type: str) -> None:
        config = get_source_config(source)
        self.enqueuer.enqueue(
            queue=config["queues"]["detail"],
            path="/internal/tasks/detail",
            payload={"source": source, "external_id": external_id, "book_type": book_type},
        )


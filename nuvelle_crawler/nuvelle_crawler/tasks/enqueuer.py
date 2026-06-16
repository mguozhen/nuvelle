import json
from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class QueuedTask:
    queue: str
    url: str
    path: str
    payload: dict
    task_name: str | None = None


class TaskEnqueuer(Protocol):
    def enqueue(self, *, queue: str, path: str, payload: dict, task_name: str | None = None) -> None:
        ...


class InMemoryTaskEnqueuer:
    def __init__(self, *, service_url: str = "https://crawler.example.com") -> None:
        self.service_url = service_url.rstrip("/")
        self.tasks: list[QueuedTask] = []

    def enqueue(self, *, queue: str, path: str, payload: dict, task_name: str | None = None) -> None:
        self.tasks.append(
            QueuedTask(
                queue=queue,
                url=f"{self.service_url}{path}",
                path=path,
                payload=payload,
                task_name=task_name,
            )
        )


class CloudTasksEnqueuer:
    def __init__(
        self,
        *,
        project: str,
        location: str,
        service_url: str,
        service_account_email: str = "",
    ) -> None:
        self.project = project
        self.location = location
        self.service_url = service_url.rstrip("/")
        self.service_account_email = service_account_email

    def enqueue(self, *, queue: str, path: str, payload: dict, task_name: str | None = None) -> None:
        from google.cloud import tasks_v2

        client = tasks_v2.CloudTasksClient()
        parent = client.queue_path(self.project, self.location, queue)
        task = {
            "http_request": {
                "http_method": tasks_v2.HttpMethod.POST,
                "url": f"{self.service_url}{path}",
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps(payload).encode("utf-8"),
            }
        }
        if self.service_account_email:
            task["http_request"]["oidc_token"] = {"service_account_email": self.service_account_email}
        if task_name:
            task["name"] = client.task_path(self.project, self.location, queue, task_name)
        client.create_task(request={"parent": parent, "task": task})


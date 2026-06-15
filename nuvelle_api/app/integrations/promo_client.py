from dataclasses import dataclass


@dataclass(frozen=True)
class PromoClientConfig:
    base_url: str


class PromoClient:
    def __init__(self, config: PromoClientConfig) -> None:
        self.config = config

    def job_url(self, job_id: str) -> str:
        return f"{self.config.base_url.rstrip('/')}/job?id={job_id}"

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite+pysqlite:///./nuvelle_crawler.db"
    crawler_base_url: str = "http://localhost:8080"
    gcp_project: str = ""
    gcp_location: str = "us-west1"
    cloud_tasks_service_account: str = ""
    reelshort_cps_token: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()


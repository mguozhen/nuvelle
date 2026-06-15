from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Nuvelle API"
    environment: str = "development"
    debug: bool = False
    log_level: str = "INFO"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "postgresql+psycopg://nuvelle:nuvelle_dev_password@localhost:5432/nuvelle"
    cors_origins: list[str] = Field(default_factory=list)

    model_config = SettingsConfigDict(env_file=(".env", "../.env"), env_nested_delimiter="__", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


def default_cors_origins() -> list[str]:
    return [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:61400",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:61400",
    ]


class Settings(BaseSettings):
    app_name: str = "Nuvelle API"
    environment: str = "development"
    debug: bool = False
    log_level: str = "INFO"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "postgresql+psycopg://nuvelle:nuvelle_dev_password@localhost:5432/nuvelle"
    cors_origins: list[str] = default_cors_origins()
    promo_storage_dir: str = "../nuvelle_kit/out"
    promo_upload_dir: str = "../nuvelle_kit/_uploads"
    promo_cache_dir: str = "../nuvelle_kit/_vidcache"
    reelshort_cps_token: str = ""
    reelshort_cps_base_url: str = "https://cps.reelshort.com"
    jwt_secret: str = "nuvelle-local-dev-secret-change-me-32-bytes"
    jwt_algorithm: str = "HS256"
    jwt_access_token_minutes: int = 60 * 24 * 7

    model_config = SettingsConfigDict(env_file=(".env", "../.env"), env_nested_delimiter="__", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()

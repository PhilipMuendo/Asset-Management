from functools import lru_cache
import json

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "CEA Asset Management"
    environment: str = "local"
    # Default to an in‑memory SQLite database for local development and tests
    database_url: str = "sqlite:///./test.db"
    # Provide a deterministic secret key for test environments; can be overridden via .env
    secret_key: str = "test-secret-key"
    access_token_expire_minutes: int = 720
    cors_origins: str = "http://localhost:5173"
    cookie_name: str = "cea_access_token"
    cookie_secure: bool = False
    cookie_samesite: str = "lax"

    email_transport: str = "console"
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_from_email: str = "assets@collective.energy"

    first_admin_email: str | None = None
    first_admin_password: str | None = None
    first_admin_first_name: str = "System"
    first_admin_last_name: str = "Admin"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    @property
    def cors_origin_list(self) -> list[str]:
        value = self.cors_origins.strip()
        if not value:
            return []
        if value.startswith("["):
            parsed = json.loads(value)
            if not isinstance(parsed, list) or not all(isinstance(item, str) for item in parsed):
                raise ValueError("CORS_ORIGINS JSON value must be a list of strings")
            return parsed
        return [origin.strip() for origin in value.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

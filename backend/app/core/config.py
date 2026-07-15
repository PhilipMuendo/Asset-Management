from functools import lru_cache
import json

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_DEV_ENVIRONMENTS = {"local", "test"}
_INSECURE_DEFAULT_SECRET_KEY = "test-secret-key"


class Settings(BaseSettings):
    app_name: str = "CEA Asset Management"
    environment: str = "local"
    # Default to an in‑memory SQLite database for local development and tests
    database_url: str = "sqlite:///./test.db"
    # Only valid outside local/test environments if explicitly overridden via .env / SECRET_KEY
    secret_key: str = _INSECURE_DEFAULT_SECRET_KEY
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

    @field_validator("database_url")
    @classmethod
    def _normalize_postgres_driver(cls, value: str) -> str:
        # Managed Postgres providers (Render, Heroku, etc.) hand out bare
        # postgres:// / postgresql:// URLs, which SQLAlchemy defaults to the
        # psycopg2 driver -- but this project only installs psycopg (v3).
        for bare_scheme in ("postgres://", "postgresql://"):
            if value.startswith(bare_scheme):
                return "postgresql+psycopg://" + value[len(bare_scheme):]
        return value

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

    @model_validator(mode="after")
    def _require_real_secret_key_outside_dev(self) -> "Settings":
        if self.environment not in _DEV_ENVIRONMENTS and self.secret_key == _INSECURE_DEFAULT_SECRET_KEY:
            raise ValueError(
                "SECRET_KEY must be set via environment/.env when ENVIRONMENT is not "
                f"one of {sorted(_DEV_ENVIRONMENTS)}. Refusing to start with the insecure default."
            )
        return self

    @model_validator(mode="after")
    def _require_secure_cookie_outside_dev(self) -> "Settings":
        if self.environment not in _DEV_ENVIRONMENTS and not self.cookie_secure:
            raise ValueError(
                "COOKIE_SECURE must be set to true via environment/.env when ENVIRONMENT is not "
                f"one of {sorted(_DEV_ENVIRONMENTS)}. Refusing to start with auth cookies sent over HTTP."
            )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Database
    DATABASE_URL: str
    DATABASE_URL_SYNC: str

    # OpenAI
    OPENAI_API_KEY: str

    # Web Push / VAPID
    VAPID_PUBLIC_KEY: str
    VAPID_PRIVATE_KEY: str
    VAPID_CONTACT: str = "rachura@crowe.com"

    # JWT Auth
    SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 10080  # 7 days

    # CORS / Frontend
    FRONTEND_URL: str = "http://localhost:3000"
    ALLOWED_ORIGINS: str = "http://localhost:3000"

    # App
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"

    # Conflict detection threshold (cosine similarity)
    CONFLICT_THRESHOLD: float = 0.75

    # GitHub webhook secret (optional — if set, validates X-Hub-Signature-256)
    GITHUB_WEBHOOK_SECRET: str = ""

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v: str) -> str:
        # Accept comma-separated origins; return as-is (split when used)
        return v

    @property
    def allowed_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT.lower() == "development"


@lru_cache()
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]


# Singleton instance — import this everywhere
settings: Settings = get_settings()

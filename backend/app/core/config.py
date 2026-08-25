import urllib.parse
from pathlib import Path
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]

class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str
    STORAGE_ENDPOINT: str
    STORAGE_ACCESS_KEY: str
    STORAGE_SECRET_KEY: str
    STORAGE_BUCKET: str
    GNANI_API_KEY: str
    GNANI_BASE_URL: str
    LLM_API_KEY: str
    LLM_MODEL: str
    LLM_BASE_URL: str = "https://integrate.api.nvidia.com/v1"
    MAX_RETRIES: int = 3
    RETRY_BACKOFF_MAX: int = 300
    FRONTEND_URL: str = "http://localhost:5173"

    @field_validator("DATABASE_URL", mode="after")
    @classmethod
    def sanitize_database_url(cls, v: str) -> str:
        if not v:
            return v
        if v.startswith("postgres://"):
            v = v.replace("postgres://", "postgresql://", 1)
        prefix, _, rest = v.partition("://")
        if rest and "@" in rest:
            userinfo, _, hostpath = rest.rpartition("@")
            if ":" in userinfo:
                user, _, password = userinfo.partition(":")
                password = urllib.parse.unquote(password)
                password = urllib.parse.quote(password, safe="*")
                v = f"{prefix}://{user}:{password}@{hostpath}"
        return v

    model_config = SettingsConfigDict(
        env_file=[BASE_DIR / ".env", ".env"],
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()


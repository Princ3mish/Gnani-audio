from pathlib import Path
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

    model_config = SettingsConfigDict(
        env_file=[BASE_DIR / ".env", ".env"],
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()


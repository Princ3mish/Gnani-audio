import json
from datetime import datetime
from uuid import UUID
from typing import Any
from pydantic import BaseModel, ConfigDict, field_validator


class AudioNoteCreateResponse(BaseModel):
    id: UUID
    status: str

    model_config = ConfigDict(from_attributes=True)


class AudioNoteOut(BaseModel):
    id: UUID
    filename: str
    duration_seconds: int | float | None = None
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SummaryDetail(BaseModel):
    summary: str
    key_points: list[str] = []
    action_items: list[str] = []


class AudioNoteDetailOut(BaseModel):
    id: UUID
    filename: str
    duration_seconds: int | float | None = None
    status: str
    transcript: str | None = None
    summary: SummaryDetail | None = None
    error_code: str | None = None
    error_message: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_validator("summary", mode="before")
    @classmethod
    def parse_summary_json(cls, v: Any) -> Any:
        if v is None:
            return None
        if isinstance(v, SummaryDetail):
            return v
        if isinstance(v, dict):
            try:
                return SummaryDetail(**v)
            except Exception:
                return None
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                if isinstance(parsed, dict):
                    return SummaryDetail(**parsed)
            except Exception:
                return None
        return None

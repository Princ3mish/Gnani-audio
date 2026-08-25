from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict


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

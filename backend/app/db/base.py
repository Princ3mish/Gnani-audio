from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass

# Import all models here so Alembic can detect them
from app.models.audio_note import AudioNote  # noqa: F401
from app.models.processing_job import ProcessingJob  # noqa: F401

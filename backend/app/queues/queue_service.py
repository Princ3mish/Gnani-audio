from uuid import UUID
from typing import Optional
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.processing_job import ProcessingJob, JobType, JobStatus
from app.workers.transcription_worker import transcribe_audio_task
from app.celery_app import celery_app


class QueueService:
    @classmethod
    def enqueue_transcription(cls, note_id: str | UUID, db: Optional[Session] = None) -> None:
        uuid_obj = UUID(str(note_id)) if isinstance(note_id, str) else note_id
        should_close = False

        if db is None:
            db = SessionLocal()
            should_close = True

        try:
            job = ProcessingJob(
                note_id=uuid_obj,
                type=JobType.TRANSCRIBE_AUDIO,
                status=JobStatus.QUEUED,
                attempts=0,
            )
            db.add(job)
            db.commit()
        finally:
            if should_close:
                db.close()

        # Dispatch Celery background task
        transcribe_audio_task.delay(str(uuid_obj))

    @classmethod
    def enqueue_summarization(cls, note_id: str | UUID, db: Optional[Session] = None) -> None:
        uuid_obj = UUID(str(note_id)) if isinstance(note_id, str) else note_id
        should_close = False

        if db is None:
            db = SessionLocal()
            should_close = True

        try:
            job = ProcessingJob(
                note_id=uuid_obj,
                type=JobType.SUMMARIZE_TRANSCRIPT,
                status=JobStatus.QUEUED,
                attempts=0,
            )
            db.add(job)
            db.commit()
        finally:
            if should_close:
                db.close()

        # Dispatch summarization task by name (stubbed for Section 7)
        try:
            celery_app.send_task(
                "app.workers.summarization_worker.summarize_transcript_task",
                args=[str(uuid_obj)],
            )
        except Exception:
            pass

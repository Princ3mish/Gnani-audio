from uuid import UUID
from typing import Optional
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.audio_note import AudioNote, NoteStatus
from app.models.processing_job import ProcessingJob, JobType, JobStatus
from app.workers.transcription_worker import transcribe_audio_task
from app.workers.summarization_worker import summarize_transcript_task


class InvalidStateError(Exception):
    pass


class DuplicateJobError(Exception):
    pass


class QueueService:
    @classmethod
    def _has_active_job(cls, note_id: UUID, job_type: JobType, db: Session) -> bool:
        active_job = (
            db.query(ProcessingJob)
            .filter(
                ProcessingJob.note_id == note_id,
                ProcessingJob.type == job_type,
                ProcessingJob.status.in_([JobStatus.QUEUED, JobStatus.PROCESSING]),
            )
            .first()
        )
        return active_job is not None

    @classmethod
    def enqueue_transcription(cls, note_id: str | UUID, db: Optional[Session] = None) -> None:
        uuid_obj = UUID(str(note_id)) if isinstance(note_id, str) else note_id
        should_close = False

        if db is None:
            db = SessionLocal()
            should_close = True

        try:
            if cls._has_active_job(uuid_obj, JobType.TRANSCRIBE_AUDIO, db):
                raise DuplicateJobError(f"An active transcription job already exists for note {uuid_obj}.")

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
            active_job = (
                db.query(ProcessingJob)
                .filter(
                    ProcessingJob.note_id == uuid_obj,
                    ProcessingJob.type == JobType.SUMMARIZE_TRANSCRIPT,
                    ProcessingJob.status.in_([JobStatus.QUEUED, JobStatus.PROCESSING]),
                )
                .first()
            )
            if not active_job:
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

        # Dispatch summarization task
        summarize_transcript_task.delay(str(uuid_obj))

    @classmethod
    def retry_transcription(cls, note_id: str | UUID, db: Optional[Session] = None) -> None:
        uuid_obj = UUID(str(note_id)) if isinstance(note_id, str) else note_id
        should_close = False

        if db is None:
            db = SessionLocal()
            should_close = True

        try:
            if cls._has_active_job(uuid_obj, JobType.TRANSCRIBE_AUDIO, db):
                raise DuplicateJobError(f"An active transcription job already exists for note {uuid_obj}.")

            note = db.query(AudioNote).filter(AudioNote.id == uuid_obj).first()
            if not note:
                raise InvalidStateError(f"AudioNote {uuid_obj} not found.")

            if note.status != NoteStatus.FAILED or (note.transcript is not None and len(note.transcript.strip()) > 0):
                raise InvalidStateError(
                    f"Cannot retry transcription: Note status is '{note.status.value}' and transcript presence is {bool(note.transcript)}."
                )

            # Reset error state & update status to QUEUED
            note.error_code = None
            note.error_message = None
            note.status = NoteStatus.QUEUED

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
    def retry_summary(cls, note_id: str | UUID, db: Optional[Session] = None) -> None:
        uuid_obj = UUID(str(note_id)) if isinstance(note_id, str) else note_id
        should_close = False

        if db is None:
            db = SessionLocal()
            should_close = True

        try:
            if cls._has_active_job(uuid_obj, JobType.SUMMARIZE_TRANSCRIPT, db):
                raise DuplicateJobError(f"An active summarization job already exists for note {uuid_obj}.")

            note = db.query(AudioNote).filter(AudioNote.id == uuid_obj).first()
            if not note:
                raise InvalidStateError(f"AudioNote {uuid_obj} not found.")

            if note.status != NoteStatus.FAILED or note.transcript is None or len(note.transcript.strip()) == 0:
                raise InvalidStateError(
                    f"Cannot retry summarization: Note status is '{note.status.value}' or transcript is missing."
                )

            # Reset error state & update status to SUMMARIZING
            note.error_code = None
            note.error_message = None
            note.status = NoteStatus.SUMMARIZING

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

        # Dispatch Celery summarization task
        summarize_transcript_task.delay(str(uuid_obj))


import os
import tempfile
from datetime import datetime, timezone
from uuid import UUID

from app.celery_app import celery_app
from app.db.session import SessionLocal
from app.models.audio_note import AudioNote, NoteStatus
from app.models.processing_job import ProcessingJob, JobType, JobStatus
from app.services.storage_service import StorageService
from app.services.gnani_service import GnaniService, GnaniError, normalize_gnani_error


@celery_app.task(name="app.workers.transcription_worker.transcribe_audio_task")
def transcribe_audio_task(note_id: str) -> None:
    db = SessionLocal()
    storage_service = StorageService()
    gnani_service = GnaniService()
    temp_path = None

    try:
        uuid_obj = UUID(note_id)
        note = db.query(AudioNote).filter(AudioNote.id == uuid_obj).first()
        if not note:
            print(f"AudioNote {note_id} not found.")
            return

        # Fetch latest TRANSCRIBE_AUDIO job
        job = (
            db.query(ProcessingJob)
            .filter(ProcessingJob.note_id == uuid_obj, ProcessingJob.type == JobType.TRANSCRIBE_AUDIO)
            .order_by(ProcessingJob.created_at.desc())
            .first()
        )

        now = datetime.now(timezone.utc)

        # Mark job as PROCESSING and note as TRANSCRIBING
        if job:
            job.status = JobStatus.PROCESSING
            job.started_at = now
            job.attempts += 1

        note.status = NoteStatus.TRANSCRIBING
        db.commit()

        # Download audio file from storage to temporary local file
        suffix = os.path.splitext(note.filename)[1] or ".mp3"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_path = temp_file.name

        storage_service.download_file(note.storage_key, temp_path)

        with open(temp_path, "rb") as f:
            audio_bytes = f.read()

        # Call Gnani STT Service
        result = gnani_service.transcribe(
            audio_bytes=audio_bytes,
            filename=note.filename,
            language="en-IN",
        )

        # Save success result
        note.transcript = result.get("transcript")
        note.gnani_request_id = result.get("request_id")
        note.status = NoteStatus.SUMMARIZING

        finished_now = datetime.now(timezone.utc)
        if job:
            job.status = JobStatus.COMPLETED
            job.finished_at = finished_now

        db.commit()

        # Dispatch summarization queue task
        from app.queues.queue_service import QueueService
        QueueService.enqueue_summarization(note_id, db=db)

    except Exception as exc:
        db.rollback()
        finished_now = datetime.now(timezone.utc)
        
        if isinstance(exc, GnaniError):
            code, safe_msg = normalize_gnani_error(exc)
        else:
            code = "TRANSCRIPTION_FAILED"
            safe_msg = f"Transcription failed: {exc}"

        try:
            uuid_obj = UUID(note_id)
            note = db.query(AudioNote).filter(AudioNote.id == uuid_obj).first()
            if note:
                note.status = NoteStatus.FAILED
                note.error_code = code
                note.error_message = safe_msg

            job = (
                db.query(ProcessingJob)
                .filter(ProcessingJob.note_id == uuid_obj, ProcessingJob.type == JobType.TRANSCRIBE_AUDIO)
                .order_by(ProcessingJob.created_at.desc())
                .first()
            )
            if job:
                job.status = JobStatus.FAILED
                job.error = str(exc)
                job.finished_at = finished_now

            db.commit()
        except Exception as db_err:
            print(f"Error persisting failure state for note {note_id}: {db_err}")

        # Re-raise exception for Celery task reporting
        raise exc
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass
        db.close()

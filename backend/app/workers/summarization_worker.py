import json
from datetime import datetime, timezone
from uuid import UUID

from app.celery_app import celery_app
from app.db.session import SessionLocal
from app.models.audio_note import AudioNote, NoteStatus
from app.models.processing_job import ProcessingJob, JobType, JobStatus
from app.services.summarization_service import (
    SummarizationService,
    SummarizationError,
    normalize_summarization_error,
)


@celery_app.task(name="app.workers.summarization_worker.summarize_transcript_task")
def summarize_transcript_task(note_id: str) -> None:
    db = SessionLocal()
    summarization_service = SummarizationService()

    try:
        uuid_obj = UUID(note_id)
        note = db.query(AudioNote).filter(AudioNote.id == uuid_obj).first()
        if not note:
            print(f"AudioNote {note_id} not found.")
            return

        if not note.transcript:
            raise SummarizationError("EMPTY_TRANSCRIPT", "Cannot generate summary for an empty or missing transcript.")

        # Fetch latest SUMMARIZE_TRANSCRIPT job
        job = (
            db.query(ProcessingJob)
            .filter(ProcessingJob.note_id == uuid_obj, ProcessingJob.type == JobType.SUMMARIZE_TRANSCRIPT)
            .order_by(ProcessingJob.created_at.desc())
            .first()
        )

        now = datetime.now(timezone.utc)

        if job:
            job.status = JobStatus.PROCESSING
            job.started_at = now
            job.attempts += 1

        note.status = NoteStatus.SUMMARIZING
        db.commit()

        # Call Summarization Service
        result_dict = summarization_service.summarize(note.transcript)

        # Store summary formatted as JSON string on AudioNote
        note.summary = json.dumps(result_dict, ensure_ascii=False, indent=2)
        note.status = NoteStatus.COMPLETED

        finished_now = datetime.now(timezone.utc)
        if job:
            job.status = JobStatus.COMPLETED
            job.finished_at = finished_now

        db.commit()

    except Exception as exc:
        db.rollback()
        finished_now = datetime.now(timezone.utc)

        if isinstance(exc, SummarizationError):
            code, safe_msg = normalize_summarization_error(exc)
        else:
            code = "SUMMARIZATION_FAILED"
            safe_msg = f"Summarization failed: {exc}"

        try:
            uuid_obj = UUID(note_id)
            note = db.query(AudioNote).filter(AudioNote.id == uuid_obj).first()
            if note:
                note.status = NoteStatus.FAILED
                note.error_code = code
                note.error_message = safe_msg

            job = (
                db.query(ProcessingJob)
                .filter(ProcessingJob.note_id == uuid_obj, ProcessingJob.type == JobType.SUMMARIZE_TRANSCRIPT)
                .order_by(ProcessingJob.created_at.desc())
                .first()
            )
            if job:
                job.status = JobStatus.FAILED
                job.error = str(exc)
                job.finished_at = finished_now

            db.commit()
        except Exception as db_err:
            print(f"Error persisting summarization failure state for note {note_id}: {db_err}")

        raise exc
    finally:
        db.close()

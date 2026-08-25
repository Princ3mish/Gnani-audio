import os
import shutil
import tempfile
from fastapi import APIRouter, Depends, File, UploadFile, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.audio_note import AudioNote, NoteStatus
from app.schemas.audio_note import AudioNoteCreateResponse, AudioNoteOut
from app.services.audio_validation_service import AudioValidationService, AudioValidationError
from app.services.storage_service import StorageService

router = APIRouter(prefix="/notes", tags=["notes"])
storage_service = StorageService()


@router.post("", status_code=status.HTTP_202_ACCEPTED, response_model=AudioNoteCreateResponse)
async def upload_audio_note(
    audio: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    filename = audio.filename or "audio_file"
    content_type = audio.content_type or ""

    suffix = os.path.splitext(filename)[1]
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    temp_path = temp_file.name

    try:
        with temp_file as buffer:
            shutil.copyfileobj(audio.file, buffer)

        file_size = os.path.getsize(temp_path)

        # 1. Validate extension and MIME type
        AudioValidationService.validate_extension_and_mime(filename, content_type)

        # 2. Validate file size
        AudioValidationService.validate_file_size(file_size, max_mb=100)

        # 3. Check for file corruption
        if AudioValidationService.is_corrupt(temp_path):
            raise AudioValidationError(
                code="CORRUPT_FILE",
                message="File cannot be opened or parsed as valid audio."
            )

        # 4. Extract and validate audio duration
        duration = AudioValidationService.get_duration_seconds(temp_path)
        AudioValidationService.validate_duration(duration, min_seconds=120)

        # Upload to S3-compatible storage
        storage_key = storage_service.generate_unique_storage_key(filename)
        storage_service.upload_file(temp_path, storage_key, content_type)

        # Persist AudioNote record in DB with status QUEUED
        note = AudioNote(
            filename=filename,
            storage_key=storage_key,
            mime_type=content_type,
            file_size=file_size,
            duration_seconds=int(round(duration)),
            status=NoteStatus.QUEUED,
        )
        db.add(note)
        db.commit()
        db.refresh(note)

        # Enqueue background transcription job
        from app.queues.queue_service import QueueService
        try:
            QueueService.enqueue_transcription(note.id, db=db)
        except Exception as q_err:
            print(f"Warning: Failed to enqueue transcription for note {note.id}: {q_err}")

        return AudioNoteCreateResponse(id=note.id, status=note.status.value)


    except AudioValidationError as err:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error_code": err.code, "message": err.message}
        )
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass


@router.get("", response_model=list[AudioNoteOut])
def list_audio_notes(db: Session = Depends(get_db)):
    notes = db.query(AudioNote).order_by(AudioNote.created_at.desc()).all()
    return notes

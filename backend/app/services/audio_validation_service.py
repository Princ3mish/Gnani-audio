from pathlib import Path
import mutagen


class AudioValidationError(Exception):
    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(message)


class AudioValidationService:
    ALLOWED_EXTENSIONS = {".mp3", ".wav", ".m4a"}
    ALLOWED_MIME_TYPES = {
        "audio/mpeg",
        "audio/mp3",
        "audio/wav",
        "audio/x-wav",
        "audio/wave",
        "audio/mp4",
        "audio/x-m4a",
        "audio/aac",
        "audio/m4a",
        "audio/x-mp4",
        "audio/m4a-latm",
    }

    @classmethod
    def validate_extension_and_mime(cls, filename: str, content_type: str) -> None:
        ext = Path(filename).suffix.lower()
        if ext not in cls.ALLOWED_EXTENSIONS:
            raise AudioValidationError(
                code="INVALID_FILE_EXTENSION",
                message=f"File extension '{ext}' is not allowed. Allowed extensions: {', '.join(sorted(cls.ALLOWED_EXTENSIONS))}"
            )
        if content_type.lower() not in cls.ALLOWED_MIME_TYPES:
            raise AudioValidationError(
                code="INVALID_MIME_TYPE",
                message=f"MIME type '{content_type}' is not allowed."
            )

    @classmethod
    def validate_file_size(cls, size_bytes: int, max_mb: int = 100) -> None:
        max_bytes = max_mb * 1024 * 1024
        if size_bytes > max_bytes:
            raise AudioValidationError(
                code="FILE_TOO_LARGE",
                message=f"File size exceeds the maximum limit of {max_mb} MB."
            )

    @classmethod
    def get_duration_seconds(cls, file_path: str) -> float:
        try:
            audio = mutagen.File(file_path)
            if audio is None or not hasattr(audio, "info") or audio.info is None or not hasattr(audio.info, "length"):
                raise AudioValidationError(
                    code="CORRUPT_FILE",
                    message="Unable to parse audio duration. File may be corrupted."
                )
            return float(audio.info.length)
        except AudioValidationError:
            raise
        except Exception as exc:
            raise AudioValidationError(
                code="CORRUPT_FILE",
                message=f"Failed to read audio file: {exc}"
            ) from exc

    @classmethod
    def validate_duration(cls, duration_seconds: float, min_seconds: int = 120) -> None:
        if duration_seconds < min_seconds:
            raise AudioValidationError(
                code="AUDIO_TOO_SHORT",
                message=f"Audio duration must be at least {min_seconds} seconds (2 minutes). Received: {duration_seconds:.1f}s."
            )

    @classmethod
    def is_corrupt(cls, file_path: str) -> bool:
        try:
            audio = mutagen.File(file_path)
            if audio is None or not hasattr(audio, "info") or audio.info is None:
                return True
            return False
        except Exception:
            return True

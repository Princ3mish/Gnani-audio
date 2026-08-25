import os
from typing import Any
import httpx

from app.core.config import settings


class GnaniError(Exception):
    def __init__(self, error_code: str, message: str):
        self.error_code = error_code
        self.message = message
        super().__init__(message)


class GnaniTimeoutError(GnaniError):
    def __init__(self, message: str = "Gnani STT request timed out or connection failed.", error_code: str = "GNANI_TIMEOUT"):
        super().__init__(error_code=error_code, message=message)


class GnaniAuthError(GnaniError):
    def __init__(self, message: str = "Gnani STT authentication failed.", error_code: str = "GNANI_AUTH_ERROR"):
        super().__init__(error_code=error_code, message=message)


class GnaniServerError(GnaniError):
    def __init__(self, message: str = "Gnani STT server encountered an error.", error_code: str = "GNANI_SERVER_ERROR"):
        super().__init__(error_code=error_code, message=message)


class GnaniBadRequestError(GnaniError):
    def __init__(self, message: str = "Gnani STT invalid request or parameters.", error_code: str = "GNANI_BAD_REQUEST"):
        super().__init__(error_code=error_code, message=message)


class GnaniService:
    def __init__(
        self,
        base_url: str | None = None,
        api_key: str | None = None,
        timeout_seconds: float = 60.0,
    ):
        self.base_url = (base_url or settings.GNANI_BASE_URL).rstrip("/")
        self.api_key = api_key or settings.GNANI_API_KEY
        self.timeout_seconds = timeout_seconds

    def _get_endpoint_url(self) -> str:
        if self.base_url.endswith("/stt/v3") or self.base_url.endswith("/stt"):
            return self.base_url
        return f"{self.base_url}/stt/v3"

    def transcribe(
        self, audio_bytes: bytes, filename: str, language: str = "en-IN"
    ) -> dict[str, Any]:
        url = self._get_endpoint_url()
        headers = {
            "X-API-Key-ID": self.api_key,
            "X-API-Key": self.api_key,
            "Authorization": f"Bearer {self.api_key}",
        }

        # Determine MIME type based on extension
        ext = os.path.splitext(filename)[1].lower()
        mime_map = {
            ".wav": "audio/wav",
            ".mp3": "audio/mpeg",
            ".m4a": "audio/x-m4a",
        }
        content_type = mime_map.get(ext, "audio/mpeg")

        files = {
            "audio_file": (filename, audio_bytes, content_type),
            "audio": (filename, audio_bytes, content_type),
        }
        data = {
            "language_code": language,
            "language": language,
        }

        try:
            with httpx.Client(timeout=self.timeout_seconds) as client:
                response = client.post(url, headers=headers, files=files, data=data)

            if response.status_code in (401, 403):
                raise GnaniAuthError(
                    f"Authentication failed (HTTP {response.status_code}). Please verify your GNANI_API_KEY."
                )
            elif 400 <= response.status_code < 500:
                err_detail = ""
                try:
                    res_json = response.json()
                    err_detail = res_json.get("detail") or res_json.get("error") or res_json.get("message") or response.text
                except Exception:
                    err_detail = response.text
                raise GnaniBadRequestError(
                    f"Gnani STT API returned HTTP {response.status_code}: {err_detail}"
                )
            elif response.status_code >= 500:
                raise GnaniServerError(
                    f"Gnani STT API internal error (HTTP {response.status_code})."
                )

            res_data = response.json()
            raw_body = res_data

            # Extract normalized fields
            transcript = (
                res_data.get("transcript")
                or res_data.get("text")
                or res_data.get("result")
                or ""
            )
            request_id = (
                res_data.get("request_id")
                or res_data.get("id")
                or res_data.get("requestId")
            )

            return {
                "transcript": str(transcript),
                "request_id": str(request_id) if request_id else None,
                "raw": raw_body,
            }

        except (httpx.TimeoutException, httpx.NetworkError, httpx.ConnectError) as exc:
            raise GnaniTimeoutError(
                f"Connection or timeout error while reaching Gnani STT API: {type(exc).__name__}"
            ) from exc
        except GnaniError:
            raise
        except Exception as exc:
            raise GnaniServerError(f"Unexpected error calling Gnani STT: {exc}") from exc


def normalize_gnani_error(exc: GnaniError) -> tuple[str, str]:
    """
    Returns a (error_code, safe_message) tuple suitable for persisting in AudioNote.
    Ensures safe_message never leaks API keys or internal tracebacks.
    """
    code = getattr(exc, "error_code", "GNANI_UNKNOWN_ERROR")
    raw_message = getattr(exc, "message", str(exc))

    # Mask any potential API key in the message
    api_key = getattr(settings, "GNANI_API_KEY", "")
    safe_message = raw_message
    if api_key and api_key in safe_message:
        safe_message = safe_message.replace(api_key, "[REDACTED_API_KEY]")

    # Ensure message is clean and user-facing safe
    if isinstance(exc, GnaniAuthError):
        safe_message = "Authentication with speech recognition service failed. Please check credentials."
    elif isinstance(exc, GnaniTimeoutError):
        safe_message = "Speech recognition request timed out or network connection failed."
    elif isinstance(exc, GnaniServerError):
        safe_message = "Speech recognition service encountered an internal error."

    return code, safe_message

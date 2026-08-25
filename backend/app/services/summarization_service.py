import json
import re
from typing import Any
import openai

from app.core.config import settings


class SummarizationError(Exception):
    def __init__(self, error_code: str, message: str):
        self.error_code = error_code
        self.message = message
        super().__init__(message)


class LLMTimeoutError(SummarizationError):
    def __init__(self, message: str = "LLM summarization request timed out.", error_code: str = "LLM_TIMEOUT"):
        super().__init__(error_code=error_code, message=message)


class LLMAuthError(SummarizationError):
    def __init__(self, message: str = "LLM service authentication failed.", error_code: str = "LLM_AUTH_ERROR"):
        super().__init__(error_code=error_code, message=message)


class LLMServerError(SummarizationError):
    def __init__(self, message: str = "LLM service encountered an internal server error.", error_code: str = "LLM_SERVER_ERROR"):
        super().__init__(error_code=error_code, message=message)


class LLMInvalidResponseError(SummarizationError):
    def __init__(self, message: str = "LLM returned malformed or invalid JSON response.", error_code: str = "LLM_INVALID_RESPONSE"):
        super().__init__(error_code=error_code, message=message)


SYSTEM_PROMPT = """You are an expert AI notes assistant. Analyze the provided audio transcript and summarize it.

CRITICAL INSTRUCTION: You MUST return ONLY a valid JSON object matching this EXACT structure with no commentary, no markdown code fences, and no surrounding text:
{
  "summary": "A clear, concise executive summary of the transcript.",
  "key_points": [
    "Key discussion point or decision 1",
    "Key discussion point or decision 2"
  ],
  "action_items": [
    "Next step or action item 1",
    "Next step or action item 2"
  ]
}
"""


class SummarizationService:
    def __init__(
        self,
        base_url: str | None = None,
        api_key: str | None = None,
        model: str | None = None,
        timeout_seconds: float = 90.0,
    ):

        self.base_url = base_url or settings.LLM_BASE_URL
        self.api_key = api_key or settings.LLM_API_KEY
        self.model = model or settings.LLM_MODEL
        self.timeout_seconds = timeout_seconds

        self.client = openai.OpenAI(
            base_url=self.base_url,
            api_key=self.api_key,
            timeout=self.timeout_seconds,
        )

    def _strip_markdown_fences(self, text: str) -> str:
        text = text.strip()
        # Remove leading ```json or ```
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        # Remove trailing ```
        text = re.sub(r"\s*```$", "", text)
        return text.strip()

    def summarize(self, transcript: str) -> dict[str, Any]:
        if not transcript or not transcript.strip():
            raise LLMInvalidResponseError("Cannot summarize an empty or blank transcript.")

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": f"Transcript:\n{transcript}"},
                ],
                temperature=0.3,
                timeout=self.timeout_seconds,
            )
        except openai.AuthenticationError as exc:
            raise LLMAuthError("Authentication with LLM provider failed. Check LLM_API_KEY.") from exc
        except (openai.APITimeoutError, openai.APIConnectionError) as exc:
            raise LLMTimeoutError(f"LLM connection or timeout error: {exc}") from exc

        except openai.InternalServerError as exc:
            raise LLMServerError(f"LLM provider server error: {exc}") from exc
        except openai.APIError as exc:
            if getattr(exc, "status_code", None) in (401, 403):
                raise LLMAuthError("LLM API authentication failed.") from exc
            elif getattr(exc, "status_code", None) and exc.status_code >= 500:
                raise LLMServerError(f"LLM API server error (HTTP {exc.status_code}).") from exc
            raise SummarizationError("LLM_API_ERROR", f"LLM API error: {exc}") from exc
        except Exception as exc:
            raise SummarizationError("LLM_UNKNOWN_ERROR", f"Unexpected error during summarization: {exc}") from exc

        # Extract content
        try:
            raw_content = response.choices[0].message.content or ""
        except (AttributeError, IndexError) as exc:
            raise LLMInvalidResponseError("LLM response choices structure is empty.") from exc

        cleaned_content = self._strip_markdown_fences(raw_content)

        try:
            data = json.loads(cleaned_content)
        except Exception as exc:
            raise LLMInvalidResponseError(
                f"Failed to parse LLM output as JSON. Raw content: {raw_content[:200]!r}"
            ) from exc

        # Schema & Type Validation
        if not isinstance(data, dict):
            raise LLMInvalidResponseError("LLM output JSON root must be an object.")

        if "summary" not in data or not isinstance(data["summary"], str):
            raise LLMInvalidResponseError("Missing or invalid 'summary' string field in LLM response.")

        if "key_points" not in data or not isinstance(data["key_points"], list):
            raise LLMInvalidResponseError("Missing or invalid 'key_points' list field in LLM response.")

        if "action_items" not in data or not isinstance(data["action_items"], list):
            raise LLMInvalidResponseError("Missing or invalid 'action_items' list field in LLM response.")

        # Ensure elements in key_points and action_items are strings
        summary = data["summary"].strip()
        key_points = [str(item).strip() for item in data["key_points"] if item]
        action_items = [str(item).strip() for item in data["action_items"] if item]

        return {
            "summary": summary,
            "key_points": key_points,
            "action_items": action_items,
        }


def normalize_summarization_error(exc: SummarizationError) -> tuple[str, str]:
    """
    Returns a (error_code, safe_message) tuple suitable for persisting in AudioNote.
    Ensures safe_message never leaks API keys or internal tracebacks.
    """
    code = getattr(exc, "error_code", "LLM_UNKNOWN_ERROR")
    raw_message = getattr(exc, "message", str(exc))

    api_key = getattr(settings, "LLM_API_KEY", "")
    safe_message = raw_message
    if api_key and api_key in safe_message:
        safe_message = safe_message.replace(api_key, "[REDACTED_API_KEY]")

    if isinstance(exc, LLMAuthError):
        safe_message = "Authentication with summarization AI service failed."
    elif isinstance(exc, LLMTimeoutError):
        safe_message = "Summarization request timed out."
    elif isinstance(exc, LLMServerError):
        safe_message = "Summarization AI service encountered an internal server error."
    elif isinstance(exc, LLMInvalidResponseError):
        safe_message = "Summarization AI returned an invalid or malformed output format."

    return code, safe_message

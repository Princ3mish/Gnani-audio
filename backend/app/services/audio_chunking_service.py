import os
import shutil
import tempfile
from pathlib import Path
from pydub import AudioSegment


class AudioChunkingService:
    @classmethod
    def needs_chunking(cls, duration_seconds: float | None, threshold_seconds: int = 600) -> bool:
        if duration_seconds is None or duration_seconds <= 0:
            return False
        return duration_seconds > threshold_seconds

    @classmethod
    def split_audio(
        cls,
        file_path: str,
        chunk_seconds: int = 300,
        overlap_seconds: int = 2,
    ) -> list[str]:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Audio file not found: {file_path}")

        ext = Path(file_path).suffix.lstrip(".").lower()
        format_map = {"mp3": "mp3", "wav": "wav", "m4a": "ipod"}
        export_format = format_map.get(ext, "mp3")

        audio = AudioSegment.from_file(file_path)
        total_length_ms = len(audio)

        chunk_ms = chunk_seconds * 1000
        overlap_ms = overlap_seconds * 1000
        step_ms = max(1000, chunk_ms - overlap_ms)

        temp_dir = tempfile.mkdtemp(prefix="audio_chunks_")
        chunk_paths: list[str] = []

        start_ms = 0
        chunk_index = 0

        while start_ms < total_length_ms:
            end_ms = min(start_ms + chunk_ms, total_length_ms)
            chunk = audio[start_ms:end_ms]

            chunk_filename = f"chunk_{chunk_index:03d}.{ext if ext in ('mp3', 'wav') else 'mp3'}"
            chunk_path = os.path.join(temp_dir, chunk_filename)

            chunk.export(chunk_path, format=export_format if ext in ("mp3", "wav") else "mp3")
            chunk_paths.append(chunk_path)

            chunk_index += 1
            if end_ms >= total_length_ms:
                break
            start_ms += step_ms

        return chunk_paths

    @classmethod
    def cleanup_chunks(cls, chunk_paths: list[str]) -> None:
        if not chunk_paths:
            return

        temp_dirs = set()
        for path in chunk_paths:
            if path and os.path.exists(path):
                try:
                    parent = os.path.dirname(path)
                    temp_dirs.add(parent)
                    os.remove(path)
                except Exception as exc:
                    print(f"Warning: Failed to remove temp chunk file {path}: {exc}")

        for temp_dir in temp_dirs:
            if temp_dir and os.path.exists(temp_dir):
                try:
                    shutil.rmtree(temp_dir, ignore_errors=True)
                except Exception as exc:
                    print(f"Warning: Failed to remove temp chunk directory {temp_dir}: {exc}")

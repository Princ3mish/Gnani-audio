from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "audio_notes",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    imports=[
        "app.workers.transcription_worker",
        "app.workers.summarization_worker",
    ],

)

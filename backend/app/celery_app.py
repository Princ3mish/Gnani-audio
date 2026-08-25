import ssl
from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "audio_notes",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_conf = {
    "task_serializer": "json",
    "result_serializer": "json",
    "accept_content": ["json"],
    "task_acks_late": True,
    "worker_prefetch_multiplier": 1,
    "imports": [
        "app.workers.transcription_worker",
        "app.workers.summarization_worker",
    ],
}

if settings.REDIS_URL.startswith("rediss://"):
    ssl_opts = {"ssl_cert_reqs": ssl.CERT_NONE}
    celery_conf["broker_use_ssl"] = ssl_opts
    celery_conf["redis_backend_use_ssl"] = ssl_opts

celery_app.conf.update(celery_conf)

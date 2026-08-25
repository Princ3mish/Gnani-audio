from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings
from app.core.limiter import limiter
from app.routers import notes_router

app = FastAPI(title="Audio Notes Platform API")
app.state.limiter = limiter

MAX_BODY_SIZE = 110 * 1024 * 1024  # 110 MB limit (allows 100MB audio file + multipart metadata)


class LimitUploadSizeMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method == "POST":
            content_length_header = request.headers.get("content-length")
            if content_length_header:
                try:
                    content_length = int(content_length_header)
                    if content_length > MAX_BODY_SIZE:
                        return JSONResponse(
                            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                            content={
                                "error_code": "REQUEST_TOO_LARGE",
                                "message": "Request payload exceeds maximum allowed size limit of 105MB.",
                            },
                        )
                except ValueError:
                    pass
        return await call_next(request)


@app.exception_handler(RateLimitExceeded)
def custom_rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={
            "error_code": "RATE_LIMIT_EXCEEDED",
            "message": "Rate limit exceeded. Please try again later.",
        },
    )


cors_origins = ["http://localhost:5173"]
if settings.FRONTEND_URL and settings.FRONTEND_URL not in cors_origins:
    cors_origins.append(settings.FRONTEND_URL)

# Configure Middleware
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(LimitUploadSizeMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(notes_router, prefix="/api")


@app.get("/api/health")
def health_check():
    return {"status": "ok"}

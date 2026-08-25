# Audio Notes Platform

An asynchronous audio processing platform designed for uploading, transcribing, and summarizing long-form audio files using FastAPI, Celery, Redis, PostgreSQL (Supabase), Gnani STT REST API, and NVIDIA NIM LLM (Llama 3.3 70B Instruct).

---

## Architecture Overview

- **Backend API**: FastAPI (REST API with rate limiting & early request body size limiting).
- **Worker**: Celery (Background audio transcription & LLM summarization with exponential backoff retries).
- **Database**: Supabase PostgreSQL (Managed Postgres database with Alembic migrations).
- **Object Storage**: Supabase Storage (S3-compatible bucket with presigned URL playback).
- **Task Queue / Broker**: Redis.
- **Frontend**: React + TypeScript + Vite.

---

## Deployment Configuration & Environment Variables

### 1. Railway Services (Backend API & Celery Worker)

Deploy two separate services in Railway attached to the `backend/` directory:

#### **Service A: FastAPI API Service**
- **Buildpack**: Nixpacks (automatically reads [`backend/nixpacks.toml`](file:///c:/Users/brixx/.gemini/antigravity-ide/scratch/audio-notes-platform/backend/nixpacks.toml) to install `ffmpeg`).
- **Start Command**:
  ```bash
  uvicorn app.main:app --host 0.0.0.0 --port $PORT
  ```
- **Environment Variables**:
  ```env
  DATABASE_URL=postgresql://postgres:Gnani%402027*@db.qirivuvrdmqycjpqcqlm.supabase.co:5432/postgres
  REDIS_URL=rediss://<your-railway-redis-connection-url>:6379/0
  STORAGE_ENDPOINT=https://qirivuvrdmqycjpqcqlm.storage.supabase.co/storage/v1/s3
  STORAGE_ACCESS_KEY=a453ea41873f5072e0ed0afd7f7dd845
  STORAGE_SECRET_KEY=96380235e69f6d317950a3c25fb91ab9d563183ef9ccb10d0bbf1c3983c62979
  STORAGE_BUCKET=audio-notes
  GNANI_API_KEY=vach_1ytE2CY5X2DU3arx8bzDOEm0VH4JzAmx8ieLtngWA3ZL2aFWaf2hxhqG34iZdnWv21hNsVuz9xIspM3J9ZtMDGbILQh3AJl9_6deb1cc720f4f61ffbda43a0c11b60d9
  GNANI_BASE_URL=https://api.vachana.ai
  LLM_API_KEY=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
  LLM_MODEL=meta/llama-3.3-70b-instruct
  LLM_BASE_URL=https://integrate.api.nvidia.com/v1
  FRONTEND_URL=https://<your-vercel-app-name>.vercel.app
  ```

#### **Service B: Celery Worker Service**
- **Buildpack**: Nixpacks.
- **Start Command**:
  ```bash
  celery -A app.celery_app worker --loglevel=info
  ```
- **Environment Variables**: Same as Service A (requires `DATABASE_URL`, `REDIS_URL`, `STORAGE_*`, `GNANI_*`, and `LLM_*`).

---

### 2. Vercel Service (Frontend)

Deploy the `frontend/` directory to Vercel.

- **Framework Preset**: Vite
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**:
  ```env
  VITE_API_BASE_URL=https://<your-railway-api-app-name>.up.railway.app
  ```

---

## Database Migrations

Run database migrations against Supabase Postgres:
```bash
cd backend
python -m alembic -c app/alembic.ini upgrade head
```

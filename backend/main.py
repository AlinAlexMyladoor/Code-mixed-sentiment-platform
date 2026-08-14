import asyncio
import json
import logging
import time
import uuid
from contextlib import asynccontextmanager

import redis
import redis.asyncio as aioredis
from fastapi import FastAPI, Request, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from sqlalchemy import func
import uvicorn

from config import get_settings
from database import SessionLocal, engine, Base
from models import ProcessedComment
from mongodb_store import store_raw_webhook
from routes.meta_auth import router as meta_auth_router
from routes.auth import router as auth_router
from routes.analytics import router as analytics_router
from routes.auth import decode_token
from schemas import DashboardMetrics, MetricsSummary, ProcessedCommentOut
from ws_manager import manager
from stripe_integration import router as billing_router
from worker import run_worker

# ─── Logging ───────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format='{"time":"%(asctime)s","level":"%(levelname)s","msg":"%(message)s"}',
)
logger = logging.getLogger("sentiment_platform")

settings = get_settings()

# ─── Rate Limiter ──────────────────────────────────────────────────────────
from limiter import limiter


# ─── Redis helpers ─────────────────────────────────────────────────────────
def get_sync_redis():
    import redis as sync_redis
    return sync_redis.from_url(settings.redis_url, decode_responses=True)


def push_to_queue(payload: dict):
    client = get_sync_redis()
    try:
        client.lpush(settings.redis_queue_key, json.dumps(payload))
    except redis.RedisError as exc:
        logger.error(f"Redis queue push failed: {exc}")


async def redis_pubsub_listener():
    """Forward worker events to dashboard WebSocket clients, with retry on disconnect."""
    retry_delay = 2
    while True:
        try:
            r = aioredis.from_url(settings.redis_url, decode_responses=True)
            pubsub = r.pubsub()
            await pubsub.subscribe(settings.redis_pubsub_channel)
            logger.info("Redis pub/sub listener started.")
            retry_delay = 2  # reset on successful connect
            try:
                # Use get_message with asyncio.sleep to avoid generator blocking issues
                while True:
                    message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                    if message and message.get("type") == "message":
                        try:
                            data = json.loads(message["data"])
                            await manager.broadcast(data)
                        except json.JSONDecodeError:
                            continue
                    await asyncio.sleep(0.01)
            except asyncio.CancelledError:
                logger.info("Redis Pub/Sub listener stopping gracefully...")
                raise
            finally:
                try:
                    await pubsub.unsubscribe(settings.redis_pubsub_channel)
                    await pubsub.close()
                except Exception:
                    pass
                try:
                    await r.aclose()
                except Exception:
                    pass
        except asyncio.CancelledError:
            break
        except Exception as exc:
            logger.warning(
                f"Redis pub/sub connection failed ({exc}). "
                f"Retrying in {retry_delay}s…"
            )
            await asyncio.sleep(retry_delay)
            retry_delay = min(retry_delay * 2, 60)  # exponential back-off, cap at 60s


# ─── Lifespan ──────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown logic using the modern lifespan pattern."""
    Base.metadata.create_all(bind=engine)
    listener_task = asyncio.create_task(redis_pubsub_listener())
    worker_task = asyncio.create_task(asyncio.to_thread(run_worker))
    logger.info("Platform started. Tables created.")
    yield
    listener_task.cancel()
    worker_task.cancel()
    try:
        await listener_task
    except asyncio.CancelledError:
        pass
    try:
        await worker_task
    except asyncio.CancelledError:
        pass
    logger.info("Platform shutting down.")


# ─── App ───────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Code-Mixed Sentiment Intelligence Platform",
    description=(
        "Social listening with boundary-optimized extraction, sarcasm detection, "
        "and sociolinguistic analytics for Romanized code-mixed languages."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Request ID + logging middleware ───────────────────────────────────────
@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    request_id = str(uuid.uuid4())[:8]
    start_time = time.time()
    request.state.request_id = request_id

    response = await call_next(request)

    duration_ms = round((time.time() - start_time) * 1000, 1)
    logger.info(
        f"id={request_id} method={request.method} path={request.url.path} "
        f"status={response.status_code} duration_ms={duration_ms}"
    )
    response.headers["X-Request-ID"] = request_id
    return response


# ─── Security headers middleware ───────────────────────────────────────────
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    return response


# ─── Routers ───────────────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(meta_auth_router)
app.include_router(analytics_router)
app.include_router(billing_router)


# ─── Webhook endpoints ─────────────────────────────────────────────────────
@app.get("/webhook")
async def verify_webhook(request: Request):
    mode      = request.query_params.get("hub.mode")
    token     = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")

    if mode == "subscribe" and token == settings.meta_verify_token:
        logger.info("Webhook verified successfully.")
        return PlainTextResponse(content=challenge)

    raise HTTPException(status_code=403, detail="Verification token mismatch")


@app.post("/webhook")
@limiter.limit("500/minute")
async def receive_webhook(request: Request, background_tasks: BackgroundTasks):
    try:
        payload = await request.json()
        background_tasks.add_task(store_raw_webhook, payload)
        background_tasks.add_task(push_to_queue, payload)
        logger.info(f"Webhook payload received, queued for processing.")
        return {"status": "success", "message": "Payload received"}
    except Exception as exc:
        logger.error(f"Webhook error: {exc}")
        raise HTTPException(status_code=500, detail="Internal Server Error")


# ─── Dashboard metrics ─────────────────────────────────────────────────────
def _build_summary(db) -> MetricsSummary:
    total = db.query(func.count(ProcessedComment.id)).scalar() or 0
    counts = dict(
        db.query(ProcessedComment.sentiment, func.count(ProcessedComment.id))
        .group_by(ProcessedComment.sentiment)
        .all()
    )
    avg_en = db.query(func.avg(ProcessedComment.english_ratio)).scalar()
    urgent = (counts.get("negative", 0) or 0) + (counts.get("sarcastic", 0) or 0)
    return MetricsSummary(
        total_comments=total,
        positive=counts.get("positive", 0) or 0,
        negative=counts.get("negative", 0) or 0,
        neutral=counts.get("neutral", 0) or 0,
        sarcastic=counts.get("sarcastic", 0) or 0,
        avg_english_ratio=round(float(avg_en or 0), 3),
        urgent_alerts=urgent,
    )


def _build_trend(db, limit: int = 24) -> list[dict]:
    rows = (
        db.query(
            func.date_trunc("hour", ProcessedComment.created_at).label("bucket"),
            ProcessedComment.sentiment,
            func.count(ProcessedComment.id),
        )
        .group_by("bucket", ProcessedComment.sentiment)
        .order_by("bucket")
        .limit(limit * 4)
        .all()
    )
    buckets: dict[str, dict] = {}
    for bucket, sentiment, count in rows:
        key = bucket.isoformat() if bucket else "unknown"
        if key not in buckets:
            buckets[key] = {"hour": key, "positive": 0, "negative": 0, "neutral": 0, "sarcastic": 0}
        buckets[key][sentiment] = count
    return list(buckets.values())[-limit:]


@app.get("/api/metrics", response_model=DashboardMetrics)
async def get_dashboard_metrics():
    db = SessionLocal()
    try:
        recent = (
            db.query(ProcessedComment)
            .order_by(ProcessedComment.created_at.desc())
            .limit(50)
            .all()
        )
        return DashboardMetrics(
            status="success",
            summary=_build_summary(db),
            trend=_build_trend(db),
            data=[ProcessedCommentOut.model_validate(c) for c in recent],
        )
    finally:
        db.close()


# ─── Comments list with filters ────────────────────────────────────────────
@app.get("/api/comments")
async def list_comments(
    sentiment: str = None,
    page_id:   str = None,
    search:    str = None,
    page:      int = 1,
    per_page:  int = 20,
):
    db = SessionLocal()
    try:
        q = db.query(ProcessedComment)
        if sentiment:
            q = q.filter(ProcessedComment.sentiment == sentiment)
        if page_id:
            q = q.filter(ProcessedComment.page_id == page_id)
        if search:
            q = q.filter(ProcessedComment.original_text.ilike(f"%{search}%"))

        total = q.count()
        items = (
            q.order_by(ProcessedComment.created_at.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
            .all()
        )
        return {
            "status":    "success",
            "total":     total,
            "page":      page,
            "per_page":  per_page,
            "data":      [ProcessedCommentOut.model_validate(c) for c in items],
        }
    finally:
        db.close()


# ─── Dead Letter Queue (DLQ) ───────────────────────────────────────────────
@app.get("/api/dlq")
async def get_dlq_items():
    client = get_sync_redis()
    try:
        items = client.lrange("meta_webhook_dlq", 0, -1)
        parsed = []
        for i, item in enumerate(items):
            try:
                parsed.append({"index": i, "data": json.loads(item)})
            except:
                pass
        return {"status": "success", "items": parsed}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/dlq/retry")
async def retry_dlq_items(background_tasks: BackgroundTasks):
    client = get_sync_redis()
    try:
        items = client.lrange("meta_webhook_dlq", 0, -1)
        client.delete("meta_webhook_dlq")
        retried = 0
        for item in items:
            try:
                data = json.loads(item)
                payload_str = data.get("payload")
                if payload_str:
                    payload_dict = json.loads(payload_str)
                    background_tasks.add_task(push_to_queue, payload_dict)
                    retried += 1
            except:
                continue
        return {"status": "success", "message": f"Re-queued {retried} items from DLQ."}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ─── WebSocket ─────────────────────────────────────────────────────────────
@app.websocket("/ws/dashboard")
async def dashboard_ws(websocket: WebSocket, token: str = None):
    if not token:
        await websocket.close(code=1008)
        return
    try:
        token_data = decode_token(token)
        if not token_data or not token_data.user_id:
            raise Exception("Invalid token")
    except Exception:
        await websocket.close(code=1008)
        return

    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# ─── Health & root ─────────────────────────────────────────────────────────

@app.get("/api/health/db")
async def db_health():
    """
    Persistence health-check.
    Runs a live COUNT(*) on processed_comments to confirm:
      1. The PostgreSQL connection is healthy.
      2. Data is actually being written (row_count > 0 after events flow).
    Use this endpoint to verify that WebSocket-streamed data is also durable.
    """
    db = SessionLocal()
    try:
        row_count = db.query(func.count(ProcessedComment.id)).scalar() or 0
        return {
            "status":    "healthy",
            "db":        "postgresql",
            "row_count": row_count,
            "message":   (
                "PostgreSQL is reachable and storing data."
                if row_count > 0
                else "Connected but no comments persisted yet."
            ),
        }
    except Exception as exc:
        logger.error(f"DB health check failed: {exc}")
        raise HTTPException(status_code=503, detail=f"Database unreachable: {exc}")
    finally:
        db.close()


@app.get("/api/inference/status")
async def inference_status():
    """
    Reports the current AI inference mode and, for llama mode, pings the
    GPU inference server to check whether it is online and ready.

    Upgrade path:
      1. Deploy ai_pipeline/inference_server.py on a GPU host.
      2. Set INFERENCE_MODE=llama and INFERENCE_URL=http://<gpu-host>:8001/analyze
      3. This endpoint will then show llama_server: 'healthy'.
    """
    import os as _os
    mode = _os.getenv("INFERENCE_MODE", "heuristic").lower()
    inference_url = settings.inference_url

    llama_status: str = "not_configured"
    if mode == "llama" and inference_url:
        health_url = inference_url.replace("/analyze", "/health").replace("/predict", "/health")
        try:
            import httpx as _httpx
            async with _httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(health_url)
                llama_status = "healthy" if resp.status_code == 200 else f"degraded (HTTP {resp.status_code})"
        except Exception as exc:
            llama_status = f"unreachable ({exc})"
    elif mode == "llama":
        llama_status = "mode=llama but INFERENCE_URL not set"

    return {
        "inference_mode":  mode,
        "llama_server":    llama_status,
        "inference_url":   inference_url or "(not set)",
        "upgrade_note": (
            "To activate Llama 3: set INFERENCE_MODE=llama and "
            "INFERENCE_URL=http://<gpu-host>:8001/analyze after deploying "
            "ai_pipeline/inference_server.py on a GPU instance."
            if mode != "llama"
            else None
        ),
    }

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "Code-Mixed Sentiment Intelligence Platform"}


@app.get("/")
async def root():
    return {
        "status":  "running",
        "service": "Code-Mixed Sentiment Intelligence Platform",
        "version": "1.0.0",
        "docs":    "/docs",
        "health":  "/health",
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

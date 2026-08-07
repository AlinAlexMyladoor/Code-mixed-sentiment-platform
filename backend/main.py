import asyncio
import json
import logging
import time
import uuid

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
from schemas import DashboardMetrics, MetricsSummary, ProcessedCommentOut
from ws_manager import manager
from stripe_integration import router as billing_router

# ─── Logging ───────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format='{"time":"%(asctime)s","level":"%(levelname)s","msg":"%(message)s"}',
)
logger = logging.getLogger("sentiment_platform")

settings = get_settings()

# ─── Rate Limiter ──────────────────────────────────────────────────────────
from limiter import limiter

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
    """Forward worker events to dashboard WebSocket clients."""
    r = aioredis.from_url(settings.redis_url, decode_responses=True)
    pubsub = r.pubsub()
    await pubsub.subscribe(settings.redis_pubsub_channel)
    logger.info("Redis pub/sub listener started.")
    try:
        async for message in pubsub.listen():
            if message["type"] != "message":
                continue
            try:
                data = json.loads(message["data"])
                await manager.broadcast(data)
            except json.JSONDecodeError:
                continue
    finally:
        await pubsub.unsubscribe(settings.redis_pubsub_channel)
        await r.close()


# ─── Startup ───────────────────────────────────────────────────────────────
@app.on_event("startup")
async def on_startup():
    Base.metadata.create_all(bind=engine)
    asyncio.create_task(redis_pubsub_listener())
    logger.info("Platform started. Tables created.")


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


# ─── WebSocket ─────────────────────────────────────────────────────────────
@app.websocket("/ws/dashboard")
async def dashboard_ws(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# ─── Health & root ─────────────────────────────────────────────────────────
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

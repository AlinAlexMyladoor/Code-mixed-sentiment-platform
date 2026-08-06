import asyncio
import json

import redis
import redis.asyncio as aioredis
from fastapi import FastAPI, Request, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from sqlalchemy import func
import uvicorn

from config import get_settings
from database import SessionLocal, engine, Base
from models import ProcessedComment
from mongodb_store import store_raw_webhook
from routes.meta_auth import router as meta_auth_router
from schemas import DashboardMetrics, MetricsSummary, ProcessedCommentOut
from ws_manager import manager

settings = get_settings()

app = FastAPI(
    title="Code-Mixed Sentiment Intelligence Platform",
    description="Social listening with boundary-optimized extraction and sociolinguistic analytics",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(meta_auth_router)


def get_sync_redis():
    import redis

    return redis.from_url(settings.redis_url, decode_responses=True)


def push_to_queue(payload: dict):
    client = get_sync_redis()
    try:
        client.lpush(settings.redis_queue_key, json.dumps(payload))
    except redis.RedisError as exc:
        print(f"Redis queue push failed: {exc}")


async def redis_pubsub_listener():
    """Forward worker events to dashboard WebSocket clients."""
    r = aioredis.from_url(settings.redis_url, decode_responses=True)
    pubsub = r.pubsub()
    await pubsub.subscribe(settings.redis_pubsub_channel)
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


@app.on_event("startup")
async def on_startup():
    Base.metadata.create_all(bind=engine)
    asyncio.create_task(redis_pubsub_listener())


@app.get("/webhook")
async def verify_webhook(request: Request):
    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")

    if mode == "subscribe" and token == settings.meta_verify_token:
        return PlainTextResponse(content=challenge)

    raise HTTPException(status_code=403, detail="Verification token mismatch")


@app.post("/webhook")
async def receive_webhook(request: Request, background_tasks: BackgroundTasks):
    try:
        payload = await request.json()
        background_tasks.add_task(store_raw_webhook, payload)
        background_tasks.add_task(push_to_queue, payload)
        return {"status": "success", "message": "Payload received"}
    except Exception as exc:
        print(f"Webhook error: {exc}")
        raise HTTPException(status_code=500, detail="Internal Server Error")


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


def _build_trend(db, limit: int = 12) -> list[dict]:
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
            .limit(30)
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


@app.websocket("/ws/dashboard")
async def dashboard_ws(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@app.get("/")
async def root():
    return {
        "status": "running",
        "service": "Code-Mixed Sentiment Intelligence Platform",
        "docs": "/docs",
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

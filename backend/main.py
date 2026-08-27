import asyncio
import json
import logging
import time
import uuid
import hmac
import hashlib
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
from models import ProcessedComment, CustomVocabulary
from inference import vocab_load_from_db, vocab_set, vocab_delete
from mongodb_store import store_raw_webhook
from routes.meta_auth import router as meta_auth_router
from routes.auth import router as auth_router
from routes.analytics import router as analytics_router, insight_router
from routes.auth import decode_token
from schemas import DashboardMetrics, MetricsSummary, ProcessedCommentOut
from pydantic import BaseModel
from ws_manager import manager
from stripe_integration import router as billing_router
from worker import run_worker
import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from reports import generate_weekly_report

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
    
    # Start APScheduler for weekly reports
    scheduler = AsyncIOScheduler()
    scheduler.add_job(generate_weekly_report, 'cron', day_of_week='mon', hour=8, minute=0)
    scheduler.start()
    logger.info("APScheduler started: Weekly report job scheduled.")

    # Auto-migrate intent_signal & ticket_id to prevent 500 errors on existing DBs
    from sqlalchemy import text
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE processed_comments ADD COLUMN IF NOT EXISTS intent_signal VARCHAR;"))
            conn.execute(text("ALTER TABLE processed_comments ADD COLUMN IF NOT EXISTS ticket_id VARCHAR;"))
            conn.execute(text("ALTER TABLE processed_comments ADD COLUMN IF NOT EXISTS ticket_status VARCHAR;"))
            conn.execute(text("ALTER TABLE processed_comments ADD COLUMN IF NOT EXISTS draft_reply VARCHAR;"))
            # original_text_raw — PII audit trail
            conn.execute(text("ALTER TABLE processed_comments ADD COLUMN IF NOT EXISTS original_text_raw TEXT;"))
            # Auto-migrate alert_rules table if not exists
            conn.execute(text('''
                CREATE TABLE IF NOT EXISTS alert_rules (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR,
                    keyword VARCHAR,
                    intent VARCHAR,
                    sentiment VARCHAR,
                    channel VARCHAR DEFAULT 'Telegram',
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            '''))
            # Auto-migrate custom_vocabulary table
            conn.execute(text('''
                CREATE TABLE IF NOT EXISTS custom_vocabulary (
                    id SERIAL PRIMARY KEY,
                    term VARCHAR NOT NULL,
                    forced_sentiment VARCHAR,
                    forced_aspect VARCHAR,
                    description VARCHAR,
                    created_by INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT uq_vocab_term UNIQUE (term)
                );
            '''))
            logger.info("Auto-migrated schema columns and tables (alert_rules, custom_vocabulary, PII fields).")
    except Exception as exc:
        logger.warning(f"Auto-migration skipped or failed: {exc}")

    listener_task = asyncio.create_task(redis_pubsub_listener())
    worker_task = asyncio.create_task(asyncio.to_thread(run_worker))
    # Load custom vocabulary cache into inference engine
    vocab_load_from_db()
    logger.info("Custom vocabulary cache pre-loaded from DB.")
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
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "https://swarasense-ui.onrender.com",
        "https://swarasense.onrender.com"
    ],
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
app.include_router(insight_router)
app.include_router(billing_router)


# ─── Webhook endpoints ─────────────────────────────────────────────────────
@app.get("/webhook")
async def verify_webhook(request: Request):
    mode      = request.query_params.get("hub.mode")
    token     = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")
    logger.info(f"Verify Webhook called. Mode: {mode}, Token length: {len(token) if token else 'None'}")

    if mode == "subscribe" and token == settings.meta_verify_token:
        logger.info("Webhook verified successfully with Meta.")
        return PlainTextResponse(content=challenge)

    logger.warning("Webhook verification failed: Token mismatch or invalid mode.")
    raise HTTPException(status_code=403, detail="Verification token mismatch")


@app.post("/webhook")
@limiter.limit("500/minute")
async def receive_webhook(request: Request, background_tasks: BackgroundTasks):
    try:
        raw_body = await request.body()
        
        # 1. HMAC Signature Verification
        if settings.meta_app_secret:
            signature = request.headers.get("X-Hub-Signature-256", "")
            if not signature.startswith("sha256="):
                raise HTTPException(status_code=403, detail="Invalid or missing signature")
            
            expected_sig = "sha256=" + hmac.new(
                settings.meta_app_secret.encode("utf-8"),
                raw_body,
                hashlib.sha256
            ).hexdigest()
            
            if not hmac.compare_digest(signature, expected_sig):
                logger.warning("Webhook HMAC signature mismatch!")
                raise HTTPException(status_code=403, detail="Signature mismatch")

        payload = json.loads(raw_body)
        logger.info(f"Webhook POST received. Payload (first 200 chars): {json.dumps(payload)[:200]}")
        background_tasks.add_task(store_raw_webhook, payload)
        background_tasks.add_task(push_to_queue, payload)
        logger.info(f"Webhook payload queued for processing via BackgroundTasks.")
        return {"status": "success", "message": "Payload received"}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Webhook error: {exc}")
        raise HTTPException(status_code=500, detail="Internal Server Error")


# ─── Live comment analyzer (used by Demo panel) ────────────────────────────
@app.post("/api/analyze")
@limiter.limit("60/minute")
async def analyze_text(request: Request):
    """
    Analyze a single comment text in real-time using the active inference engine.
    Used by the frontend Demo panel to let users try the platform without webhooks.
    """
    try:
        body = await request.json()
        text = (body.get("text") or "").strip()
        if not text:
            raise HTTPException(status_code=422, detail="text field is required")
        if len(text) > 2000:
            raise HTTPException(status_code=422, detail="text must be under 2000 characters")

        from inference import analyze_comment
        result = analyze_comment(text)

        return {
            "text": text,
            "sentiment": result.sentiment,
            "confidence": round(result.confidence, 4),
            "english_ratio": round(result.english_ratio, 4),
            "language_switch_count": result.language_switch_count,
            "sarcasm_score": round(result.sarcasm_score, 4),
            "sarcasm_signals": result.sarcasm_signals,
            "extracted_entities": result.extracted_entities,
            "regional_tokens_found": result.regional_tokens_found,
            "inference_source": result.source,
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Analyze error: {exc}")
        raise HTTPException(status_code=500, detail="Analysis failed")

@app.post("/webhook/instagram")
async def webhook_instagram(payload: dict):
    """Mock endpoint for Instagram webhooks."""
    try:
        redis_client.lpush(settings.redis_queue_key, json.dumps(payload))
        return {"status": "accepted"}
    except Exception as exc:
        logger.error(f"Error publishing to Redis: {exc}")
        raise HTTPException(status_code=500, detail="Internal processing error")

@app.post("/webhook/youtube")
async def webhook_youtube(payload: dict):
    """Mock endpoint for YouTube Data API push notifications."""
    try:
        redis_client.lpush(settings.redis_queue_key, json.dumps(payload))
        return {"status": "accepted"}
    except Exception as exc:
        logger.error(f"Error publishing to Redis: {exc}")
        raise HTTPException(status_code=500, detail="Internal processing error")

@app.post("/webhook/twitter")
async def webhook_twitter(payload: dict):
    """Mock endpoint for Twitter/X Account Activity API."""
    try:
        redis_client.lpush(settings.redis_queue_key, json.dumps(payload))
        return {"status": "accepted"}
    except Exception as exc:
        logger.error(f"Error publishing to Redis: {exc}")
        raise HTTPException(status_code=500, detail="Internal processing error")

# ─── Simulated webhook generator ─────────────────────────────────────────────────────
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

@app.delete("/api/comments/{comment_id}")
async def delete_comment(comment_id: int):
    db = SessionLocal()
    try:
        c = db.query(ProcessedComment).filter(ProcessedComment.id == comment_id).first()
        if not c:
            raise HTTPException(status_code=404, detail="Comment not found")
        db.delete(c)
        db.commit()
        return {"status": "success"}
    finally:
        db.close()

from datetime import datetime, timedelta

@app.delete("/api/comments/purge")
async def purge_comments(days: int = 30):
    db = SessionLocal()
    try:
        cutoff = datetime.utcnow() - timedelta(days=days)
        result = db.query(ProcessedComment).filter(ProcessedComment.created_at < cutoff).delete()
        db.commit()
        return {"status": "success", "deleted_count": result}
    finally:
        db.close()

@app.post("/api/comments/{comment_id}/ticket")
async def create_ticket(comment_id: int):
    """
    Simulates a CRM / Helpdesk integration by generating a ticket ID 
    and linking it to a negative or sarcastic comment.
    """
    import random
    db = SessionLocal()
    try:
        comment = db.query(ProcessedComment).filter(ProcessedComment.id == comment_id).first()
        if not comment:
            raise HTTPException(status_code=404, detail="Comment not found")
        if comment.ticket_id:
            raise HTTPException(status_code=400, detail="Ticket already created for this comment")
        
        # Simulate ticket creation in external system
        new_ticket_id = f"TKT-{random.randint(1000, 9999)}"
        comment.ticket_id = new_ticket_id
        comment.ticket_status = "Open"
        db.commit()
        return {"status": "success", "ticket_id": new_ticket_id, "ticket_status": "Open"}
    finally:
        db.close()

@app.get("/api/tickets")
async def list_tickets():
    """Fetch all comments that have been escalated to tickets."""
    db = SessionLocal()
    try:
        tickets = db.query(ProcessedComment).filter(ProcessedComment.ticket_id.isnot(None)).order_by(ProcessedComment.created_at.desc()).all()
        return {"status": "success", "data": [ProcessedCommentOut.model_validate(t) for t in tickets]}
    finally:
        db.close()

class TicketStatusUpdate(BaseModel):
    status: str

@app.patch("/api/tickets/{ticket_id}")
async def update_ticket_status(ticket_id: str, update: TicketStatusUpdate):
    """Update the status of an existing ticket."""
    if update.status not in ("Open", "In Progress", "Resolved"):
        raise HTTPException(status_code=400, detail="Invalid status")
    db = SessionLocal()
    try:
        comment = db.query(ProcessedComment).filter(ProcessedComment.ticket_id == ticket_id).first()
        if not comment:
            raise HTTPException(status_code=404, detail="Ticket not found")
        comment.ticket_status = update.status
        db.commit()
        return {"status": "success", "ticket_id": ticket_id, "ticket_status": update.status}
    finally:
        db.close()

@app.post("/api/comments/{comment_id}/draft-reply")
async def generate_reply_for_comment(comment_id: int):
    """Generates an AI draft reply for the comment."""
    db = SessionLocal()
    try:
        from inference import generate_draft_reply
        comment = db.query(ProcessedComment).filter(ProcessedComment.id == comment_id).first()
        if not comment:
            raise HTTPException(status_code=404, detail="Comment not found")
        
        reply = generate_draft_reply(
            text=comment.original_text,
            sentiment=comment.sentiment,
            intent=comment.intent_signal,
            lang_ratio=comment.english_ratio or 1.0
        )
        comment.draft_reply = reply
        db.commit()
        return {"status": "success", "draft_reply": reply}
    finally:
        db.close()

from fastapi.responses import FileResponse

@app.get("/api/reports/latest")
async def get_latest_report():
    """Returns the most recently generated weekly PDF report."""
    import os
    reports_dir = "reports"
    if not os.path.exists(reports_dir):
        raise HTTPException(status_code=404, detail="No reports available yet.")
    files = sorted([f for f in os.listdir(reports_dir) if f.endswith(".pdf")], reverse=True)
    if not files:
        raise HTTPException(status_code=404, detail="No reports available yet.")
    return FileResponse(path=os.path.join(reports_dir, files[0]), filename=files[0], media_type="application/pdf")

# ─── Alert Rules ───────────────────────────────────────────────────────────
from schemas import AlertRuleOut, AlertRuleCreate
from models import AlertRule

@app.get("/api/alert-rules", response_model=list[AlertRuleOut])
def get_alert_rules():
    db = SessionLocal()
    try:
        return db.query(AlertRule).order_by(AlertRule.created_at.desc()).all()
    finally:
        db.close()

@app.post("/api/alert-rules", response_model=AlertRuleOut)
def create_alert_rule(rule: AlertRuleCreate):
    db = SessionLocal()
    try:
        new_rule = AlertRule(**rule.model_dump())
        db.add(new_rule)
        db.commit()
        db.refresh(new_rule)
        return new_rule
    finally:
        db.close()

@app.delete("/api/alert-rules/{rule_id}")
def delete_alert_rule(rule_id: int):
    db = SessionLocal()
    try:
        rule = db.query(AlertRule).filter(AlertRule.id == rule_id).first()
        if not rule:
            raise HTTPException(status_code=404, detail="Rule not found")
        db.delete(rule)
        db.commit()
        return {"status": "success"}
    finally:
        db.close()

# ─── RBAC — Role-Based Access Control ─────────────────────────────────────
from typing import Callable
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def require_role(allowed_roles: list[str]) -> Callable:
    """
    FastAPI dependency factory that checks the authenticated user's role.
    Usage: @app.get("/protected", dependencies=[Depends(require_role(["admin", "manager"]))])
    Gracefully degrades: if no token is present (unauthenticated), access is allowed
    to avoid breaking the demo/open-access mode. Enforce strictly when auth middleware
    is enabled end-to-end.
    """
    async def _check(token: str = Depends(oauth2_scheme)):
        if not token:
            return  # Open access / demo mode — skip role enforcement
        try:
            payload = decode_token(token)
            role = payload.get("role", "agent")
            if role not in allowed_roles:
                raise HTTPException(
                    status_code=403,
                    detail=f"Access denied. Required roles: {allowed_roles}. Your role: {role}"
                )
        except HTTPException:
            raise
        except Exception:
            pass  # Token parse failure — allow degraded access
    return _check


# ─── Custom Vocabulary CRUD ────────────────────────────────────────────────
from pydantic import BaseModel as PydanticBase


class VocabCreate(PydanticBase):
    term: str
    forced_sentiment: str | None = None
    forced_aspect: str | None = None
    description: str | None = None


class VocabOut(PydanticBase):
    id: int
    term: str
    forced_sentiment: str | None
    forced_aspect: str | None
    description: str | None
    created_at: str | None = None

    class Config:
        from_attributes = True


@app.get("/api/vocabulary", response_model=list[VocabOut],
         dependencies=[Depends(require_role(["admin", "manager"]))])
def list_vocabulary():
    """List all custom vocabulary terms."""
    db = SessionLocal()
    try:
        rows = db.query(CustomVocabulary).order_by(CustomVocabulary.created_at.desc()).all()
        return [
            VocabOut(
                id=r.id, term=r.term,
                forced_sentiment=r.forced_sentiment,
                forced_aspect=r.forced_aspect,
                description=r.description,
                created_at=r.created_at.isoformat() if r.created_at else None,
            ) for r in rows
        ]
    finally:
        db.close()


@app.post("/api/vocabulary", response_model=VocabOut, status_code=201,
          dependencies=[Depends(require_role(["admin", "manager"]))])
def create_vocabulary_term(body: VocabCreate):
    """Add a new term to the brand vocabulary (takes effect immediately)."""
    db = SessionLocal()
    try:
        existing = db.query(CustomVocabulary).filter(CustomVocabulary.term == body.term.lower()).first()
        if existing:
            raise HTTPException(status_code=409, detail=f"Term '{body.term}' already exists.")
        row = CustomVocabulary(
            term=body.term.lower(),
            forced_sentiment=body.forced_sentiment,
            forced_aspect=body.forced_aspect,
            description=body.description,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        # Update live inference cache immediately — no restart needed
        vocab_set(row.term, row.forced_sentiment, row.forced_aspect)
        logger.info(f"Vocabulary term '{row.term}' added and cache updated.")
        return VocabOut(
            id=row.id, term=row.term,
            forced_sentiment=row.forced_sentiment,
            forced_aspect=row.forced_aspect,
            description=row.description,
            created_at=row.created_at.isoformat() if row.created_at else None,
        )
    finally:
        db.close()


@app.delete("/api/vocabulary/{term_id}",
            dependencies=[Depends(require_role(["admin", "manager"]))])
def delete_vocabulary_term(term_id: int):
    """Remove a vocabulary term (takes effect immediately)."""
    db = SessionLocal()
    try:
        row = db.query(CustomVocabulary).filter(CustomVocabulary.id == term_id).first()
        if not row:
            raise HTTPException(status_code=404, detail="Term not found")
        term = row.term
        db.delete(row)
        db.commit()
        # Remove from live inference cache immediately
        vocab_delete(term)
        logger.info(f"Vocabulary term '{term}' deleted and cache updated.")
        return {"status": "success", "deleted_term": term}
    finally:
        db.close()


# ─── Queue Health ────────────────────────────────────────────────────────────
import os as _os


@app.get("/api/health/queue")
def queue_health():
    """
    Returns the current depth of the Redis processing queue and the file-based DLQ.
    Used by the Settings dashboard to monitor pipeline health in real time.
    """
    dlq_file = _os.path.join(_os.path.dirname(__file__), "dlq_fallback.jsonl")
    try:
        client = get_sync_redis()
        queue_depth = client.llen(settings.redis_queue_key)
        redis_dlq_depth = client.llen("meta_webhook_dlq")
    except Exception:
        queue_depth = -1
        redis_dlq_depth = -1

    file_dlq_depth = 0
    if _os.path.exists(dlq_file):
        try:
            with open(dlq_file) as f:
                file_dlq_depth = sum(1 for line in f if line.strip())
        except OSError:
            pass

    return {
        "status":          "healthy" if queue_depth >= 0 else "degraded",
        "queue_depth":     queue_depth,
        "redis_dlq_depth": redis_dlq_depth,
        "file_dlq_depth":  file_dlq_depth,
        "total_dlq":       max(0, redis_dlq_depth) + file_dlq_depth,
    }


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
async def dashboard_ws(websocket: WebSocket):
    logger.info(f"Incoming WebSocket connection request. (Authentication disabled for open access)")
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected")
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

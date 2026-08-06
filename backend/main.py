from fastapi import FastAPI, Request, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
import uvicorn
import redis
import json

from database import SessionLocal
from models import ProcessedComment

app = FastAPI(title="Sentiment Platform API Gateway")

# -----------------------------
# CORS Configuration
# -----------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# Redis Configuration
# -----------------------------
redis_client = redis.Redis(
    host="localhost",
    port=6379,
    db=0,
    socket_connect_timeout=1,
    socket_timeout=1,
    decode_responses=True
)

# -----------------------------
# Meta Verify Token
# -----------------------------
META_VERIFY_TOKEN = "your_secure_verify_token_here"

# -----------------------------
# Push Webhook Payload to Redis
# -----------------------------
def push_to_queue(payload: dict):
    try:
        redis_client.lpush(
            "meta_webhook_queue",
            json.dumps(payload)
        )
        print("✅ Payload pushed to Redis queue.")
    except redis.RedisError as exc:
        print(f"⚠️ Redis unavailable, skipping queue push: {exc}")

# -----------------------------
# Meta Webhook Verification
# -----------------------------
@app.get("/webhook")
async def verify_webhook(request: Request):

    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")

    if mode == "subscribe" and token == META_VERIFY_TOKEN:
        print("✅ Webhook Verified!")
        return PlainTextResponse(content=challenge)

    raise HTTPException(
        status_code=403,
        detail="Verification token mismatch"
    )

# -----------------------------
# Receive Meta Webhook Events
# -----------------------------
@app.post("/webhook")
async def receive_webhook(
    request: Request,
    background_tasks: BackgroundTasks
):
    try:

        payload = await request.json()

        print("📩 Webhook Received:")
        print(payload)

        background_tasks.add_task(
            push_to_queue,
            payload
        )

        return {
            "status": "success",
            "message": "Payload received"
        }

    except Exception as e:
        print(f"❌ Error: {e}")

        raise HTTPException(
            status_code=500,
            detail="Internal Server Error"
        )

# -----------------------------
# Dashboard Metrics API
# -----------------------------
@app.get("/api/metrics")
async def get_dashboard_metrics():

    db = SessionLocal()

    try:

        recent_comments = (
            db.query(ProcessedComment)
            .order_by(ProcessedComment.created_at.desc())
            .limit(20)
            .all()
        )

        return {
            "status": "success",
            "data": recent_comments
        }

    finally:
        db.close()

# -----------------------------
# Health Check
# -----------------------------
@app.get("/")
async def root():
    return {
        "status": "running",
        "service": "Sentiment Platform API Gateway"
    }

# -----------------------------
# Run FastAPI
# -----------------------------
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
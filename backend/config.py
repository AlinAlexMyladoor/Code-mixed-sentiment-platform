import os
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()


@lru_cache
def get_settings():
    return Settings()


class Settings:
    meta_verify_token: str = os.getenv("META_VERIFY_TOKEN", "your_secure_verify_token_here")
    meta_app_id: str = os.getenv("META_APP_ID", "")
    meta_app_secret: str = os.getenv("META_APP_SECRET", "")
    meta_redirect_uri: str = os.getenv(
        "META_REDIRECT_URI", "http://localhost:8000/auth/meta/callback"
    )

    database_url: str = os.getenv(
        "DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/sentiment_db"
    )
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    mongodb_url: str = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    mongodb_db: str = os.getenv("MONGODB_DB", "sentiment_platform")

    inference_url: str | None = os.getenv("INFERENCE_URL") or None
    # Always allow local dev origins plus any URLs declared in CORS_ORIGINS.
    # On Render: set CORS_ORIGINS=https://swarasense-ui.onrender.com
    # Both local dev AND the live frontend will be allowed simultaneously.
    _dev_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    _env_origins: list[str] = [
        o.strip()
        for o in os.getenv("CORS_ORIGINS", "").split(",")
        if o.strip()
    ]
    cors_origins: list[str] = list(dict.fromkeys(_dev_origins + _env_origins))

    redis_queue_key: str = "meta_webhook_queue"
    redis_pubsub_channel: str = "comment_processed"

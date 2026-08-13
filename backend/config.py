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

    # ── CORS Origins ──────────────────────────────────────────────────────────
    # Rules:
    #   1. Localhost dev URLs are always allowed (hardcoded baseline).
    #   2. The live Render frontend is hardcoded — no env var needed for it.
    #   3. Any extra origins can be injected via CORS_ORIGINS (comma-separated).
    #   4. All origins are stripped of trailing slashes — a trailing slash causes
    #      a 100% match failure that looks identical to a missing CORS rule.
    _dev_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    # Exact Render production frontend URL — no trailing slash.
    _prod_origins: list[str] = [
        "https://swarasense-ui.onrender.com",
    ]
    _env_origins: list[str] = [
        o.strip().rstrip("/")
        for o in os.getenv("CORS_ORIGINS", "").split(",")
        if o.strip()
    ]
    cors_origins: list[str] = list(
        dict.fromkeys(
            [o.rstrip("/") for o in _dev_origins + _prod_origins + _env_origins]
        )
    )

    redis_queue_key: str = "meta_webhook_queue"
    redis_pubsub_channel: str = "comment_processed"

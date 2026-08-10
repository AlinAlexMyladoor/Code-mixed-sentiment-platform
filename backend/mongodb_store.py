from datetime import datetime, timezone
from typing import Any

from config import get_settings

_client = None


def _get_mongo_client():
    """Return a MongoClient only if MONGODB_URL is configured, else None."""
    global _client
    settings = get_settings()
    if not settings.mongodb_url:
        return None
    # Lazy-import so pymongo is not required when MongoDB is unused.
    try:
        from pymongo import MongoClient
        if _client is None:
            _client = MongoClient(settings.mongodb_url, serverSelectionTimeoutMS=3000)
        return _client
    except Exception as exc:
        print(f"MongoDB client creation failed (non-fatal): {exc}")
        return None


def store_raw_webhook(payload: dict[str, Any], source: str = "meta") -> str | None:
    """
    Archive the raw webhook payload to MongoDB.
    Silently returns None when MongoDB is not configured (e.g. Render free tier).
    All processed data is durably stored in PostgreSQL regardless.
    """
    try:
        client = _get_mongo_client()
        if client is None:
            return None
        settings = get_settings()
        collection = client[settings.mongodb_db]["webhook_payloads"]
        result = collection.insert_one(
            {
                "source": source,
                "received_at": datetime.now(timezone.utc),
                "payload": payload,
            }
        )
        return str(result.inserted_id)
    except Exception as exc:
        print(f"MongoDB store failed (non-fatal): {exc}")
        return None

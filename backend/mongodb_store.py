from datetime import datetime, timezone
from typing import Any

from pymongo import MongoClient
from pymongo.collection import Collection

from config import get_settings

_client: MongoClient | None = None


def get_mongo_collection() -> Collection:
    global _client
    settings = get_settings()
    if _client is None:
        _client = MongoClient(settings.mongodb_url)
    return _client[settings.mongodb_db]["webhook_payloads"]


def store_raw_webhook(payload: dict[str, Any], source: str = "meta") -> str | None:
    try:
        collection = get_mongo_collection()
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

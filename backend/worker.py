import json
import logging
import time

import redis

from config import get_settings
from database import SessionLocal
from inference import analyze_comment
from models import ProcessedComment

logger = logging.getLogger("sentiment_worker")
logging.basicConfig(
    level=logging.INFO,
    format='{"time":"%(asctime)s","level":"%(levelname)s","msg":"%(message)s"}',
)

settings = get_settings()
redis_client = redis.from_url(
    settings.redis_url,
    decode_responses=True,
    socket_keepalive=True,
    health_check_interval=30,
)


def extract_comments_from_payload(payload: dict) -> list[dict]:
    """Parse Meta webhook payloads for Facebook feed and Instagram comment events."""
    comments: list[dict] = []
    for entry in payload.get("entry", []):
        page_id = str(entry.get("id", ""))
        for change in entry.get("changes", []):
            value      = change.get("value", {}) or {}
            text       = value.get("message") or value.get("text") or ""
            comment_id = value.get("comment_id") or value.get("id") or "unknown"
            parent_id  = value.get("parent_id")
            if text:
                comments.append(
                    {
                        "comment_id": str(comment_id),
                        "text":       text,
                        "page_id":    page_id,
                        "parent_comment_id": str(parent_id) if parent_id else None,
                    }
                )
    return comments


def publish_processed_event(record: ProcessedComment) -> None:
    event = {
        "type": "comment_processed",
        "data": {
            "id":                    record.id,
            "platform_id":           record.platform_id,
            "page_id":               record.page_id,
            "original_text":         record.original_text,
            "sentiment":             record.sentiment,
            "english_ratio":         record.english_ratio,
            "language_switch_count": record.language_switch_count,
            "confidence":            record.confidence,
            "inference_source":      record.inference_source,
            "sarcasm_signals":       record.sarcasm_signals,
            "regional_tokens_found": record.regional_tokens_found,
            "created_at":            record.created_at.isoformat() if record.created_at else None,
        },
    }
    try:
        redis_client.publish(settings.redis_pubsub_channel, json.dumps(event))
    except redis.RedisError as exc:
        logger.error(f"Pub/sub publish failed: {exc}")


def process_webhook_payload(payload_str: str) -> None:
    payload  = json.loads(payload_str)
    comments = extract_comments_from_payload(payload)
    if not comments:
        logger.info("No comment text found in payload.")
        return

    db = SessionLocal()
    try:
        for item in comments:
            text = item["text"]
            logger.info(f"Processing: {text[:80]}...")

            analysis = analyze_comment(text)
            record = ProcessedComment(
                platform_id=item["comment_id"],
                page_id=item.get("page_id"),
                parent_comment_id=item.get("parent_comment_id"),
                original_text=text,
                extracted_entities=analysis.extracted_entities,
                sentiment=analysis.sentiment,
                english_ratio=analysis.english_ratio,
                language_switch_count=analysis.language_switch_count,
                confidence=analysis.confidence,
                inference_source=analysis.source,
                sarcasm_signals=analysis.sarcasm_signals,
                regional_tokens_found=analysis.regional_tokens_found,
                raw_payload=payload,
            )
            db.add(record)
            db.commit()
            db.refresh(record)
            publish_processed_event(record)
            logger.info(
                f"Result -> {analysis.sentiment} "
                f"(conf={analysis.confidence:.2f}) "
                f"EN={analysis.english_ratio:.2f} "
                f"switches={analysis.language_switch_count} "
                f"source={analysis.source}"
            )
    except Exception as exc:
        db.rollback()
        logger.error(f"Error processing payload: {exc}")
    finally:
        db.close()


def run_worker() -> None:
    logger.info(f"Worker listening on Redis queue '{settings.redis_queue_key}'...")
    while True:
        try:
            result = redis_client.brpop(settings.redis_queue_key, timeout=5)
            if result:
                _, payload_str = result
                process_webhook_payload(payload_str)
        except redis.exceptions.TimeoutError:
            continue
        except redis.ConnectionError as exc:
            logger.error(f"Redis connection error: {exc}. Retrying in 5s...")
            time.sleep(5)
        except Exception as exc:
            logger.error(f"Worker error: {exc}")
            time.sleep(5)


if __name__ == "__main__":
    run_worker()

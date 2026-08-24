import json
import logging
import time
import datetime
import urllib.request
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
        entry_time = entry.get("time")
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
                        "created_at": entry_time
                    }
                )
    return comments


def publish_processed_event(record: ProcessedComment) -> None:
    event = {
        "type": "comment_processed",
        # persisted=True signals the frontend that this comment is already durably
        # committed to PostgreSQL — safe to trust for chart rendering without a re-poll.
        "persisted": True,
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
            "sarcasm_score":         record.sarcasm_score,
            "sarcasm_signals":       record.sarcasm_signals,
            "regional_tokens_found": record.regional_tokens_found,
            "aspect_sentiments":     record.aspect_sentiments or {},
            "created_at":            record.created_at.isoformat() if record.created_at else None,
        },
    }
    try:
        payload = json.dumps(event)
        logger.info(f"Publishing processed event to Redis pub/sub: {payload[:200]}")
        redis_client.publish(settings.redis_pubsub_channel, payload)
    except redis.RedisError as exc:
        logger.error(f"Pub/sub publish failed: {exc}")


def send_telegram_alert(record) -> None:
    """Fire a Telegram message when a high-confidence negative/sarcastic comment arrives."""
    token   = settings.telegram_bot_token
    chat_id = settings.telegram_chat_id
    if not token or not chat_id:
        return  # not configured — skip silently
    try:
        import urllib.request as _req
        sentiment_emoji = {"negative": "🔴", "sarcastic": "⚠️"}.get(record.sentiment, "❗")
        conf_pct = int((record.confidence or 0) * 100)
        msg = (
            f"{sentiment_emoji} SwaraSense Alert\n\n"
            f"Sentiment: {record.sentiment.upper()} ({conf_pct}% confidence)\n"
            f"Comment: {record.original_text[:300]}\n"
            f"EN Ratio: {round((record.english_ratio or 0)*100)}% English\n"
            f"Model: {record.inference_source or 'unknown'}\n"
            f"Time: {record.created_at.strftime('%d %b %Y, %I:%M %p') if record.created_at else 'N/A'}"
        )
        import urllib.parse
        data = urllib.parse.urlencode({
            "chat_id":    chat_id,
            "text":       msg,
        }).encode()
        url = f"https://api.telegram.org/bot{token}/sendMessage"
        req = _req.Request(url, data=data, method="POST")
        with _req.urlopen(req, timeout=5) as resp:
            logger.info(f"Telegram alert sent (HTTP {resp.status}) for comment {record.platform_id}")
    except Exception as exc:
        logger.warning(f"Telegram alert failed (non-critical): {exc}")


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
                sarcasm_score=round(analysis.sarcasm_score, 4),
                sarcasm_signals=analysis.sarcasm_signals,
                regional_tokens_found=analysis.regional_tokens_found,
                aspect_sentiments=analysis.aspect_sentiments or {},
                raw_payload=payload,
            )
            if item.get("created_at"):
                record.created_at = datetime.datetime.fromtimestamp(item["created_at"])

            db.add(record)
            db.commit()
            db.refresh(record)

            # ── Telegram real-time alert ──────────────────────────────
            if (
                record.sentiment in ("negative", "sarcastic")
                and (record.confidence or 0) >= settings.alert_confidence_threshold
            ):
                send_telegram_alert(record)
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
        try:
            dlq_item = {
                "payload": payload_str,
                "error": str(exc),
                "failed_at": time.time()
            }
            redis_client.lpush("meta_webhook_dlq", json.dumps(dlq_item))
        except Exception as dlq_exc:
            logger.error(f"Failed to push to DLQ: {dlq_exc}")
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

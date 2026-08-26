import json
import logging
import os
import time
import datetime
import redis

from config import get_settings
from database import SessionLocal
from inference import analyze_comment, vocab_load_from_db
from models import ProcessedComment, AlertRule

logger = logging.getLogger("sentiment_worker")
logging.basicConfig(
    level=logging.INFO,
    format='{"time":"%(asctime)s","level":"%(levelname)s","msg":"%(message)s"}',
)

settings = get_settings()

# ─── DLQ path (file-based fallback when Redis is unavailable) ─────────────────
DLQ_FILE = os.path.join(os.path.dirname(__file__), "dlq_fallback.jsonl")

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
        import urllib.parse
        sentiment_label = {"negative": "NEGATIVE", "sarcastic": "SARCASTIC"}.get(record.sentiment, record.sentiment.upper())
        conf_pct = int((record.confidence or 0) * 100)
        msg = (
            f"SwaraSense Alert\n\n"
            f"Sentiment: {sentiment_label} ({conf_pct}% confidence)\n"
            f"Comment: {record.original_text[:300]}\n"
            f"Model: {record.inference_source or 'unknown'}\n"
            f"Time: {record.created_at.strftime('%d %b %Y, %I:%M %p') if record.created_at else 'N/A'}"
        )
        data = urllib.parse.urlencode({
            "chat_id": chat_id,
            "text":    msg,
        }).encode()
        url = f"https://api.telegram.org/bot{token}/sendMessage"
        req = _req.Request(url, data=data, method="POST")
        with _req.urlopen(req, timeout=5) as resp:
            logger.info(f"Telegram alert sent (HTTP {resp.status}) for comment {record.platform_id}")
    except Exception as exc:
        logger.warning(f"Telegram alert failed (non-critical): {exc}")


def evaluate_alert_rules(record, db) -> None:
    """Evaluate custom alert rules and route appropriately."""
    rules = db.query(AlertRule).filter(AlertRule.is_active == True).all()

    text_lower = record.original_text.lower()

    for rule in rules:
        match = True
        if rule.keyword and rule.keyword.lower() not in text_lower:
            match = False
        if rule.intent and rule.intent != record.intent_signal:
            match = False
        if rule.sentiment and rule.sentiment != record.sentiment:
            match = False

        if match:
            logger.info(f"Rule '{rule.name}' triggered! Routing to {rule.channel}...")
            if rule.channel == "Telegram":
                send_telegram_alert(record)
            else:
                logger.info(f"SIMULATED: Sent alert to {rule.channel}")

    # Fallback to default Telegram alert if no rules exist but it's negative/sarcastic
    if not rules and record.sentiment in ("negative", "sarcastic") and (record.confidence or 0) >= settings.alert_confidence_threshold:
        send_telegram_alert(record)


def _push_to_dlq(payload_str: str, error: str) -> None:
    """Write a failed payload to the file-based dead-letter queue."""
    try:
        entry = {"payload": payload_str, "error": error, "failed_at": time.time()}
        with open(DLQ_FILE, "a") as f:
            f.write(json.dumps(entry) + "\n")
        logger.warning(f"Payload pushed to file DLQ ({DLQ_FILE}). Error: {error[:120]}")
    except OSError as e:
        logger.error(f"CRITICAL — could not write to DLQ file: {e}")


def process_webhook_payload(payload_str: str) -> None:
    payload  = json.loads(payload_str)
    comments = extract_comments_from_payload(payload)
    if not comments:
        logger.info("No comment text found in payload.")
        return

    db = SessionLocal()
    try:
        for item in comments:
            raw_text = item["text"]
            logger.info(f"Processing: {raw_text[:80]}...")

            analysis = analyze_comment(raw_text)
            # analyze_comment() now returns sentiment/aspects after PII redaction
            # and vocabulary override. The redacted text is what inference ran on.
            redacted_text = analysis.extracted_entities.get("__redacted_input__", raw_text)

            record = ProcessedComment(
                platform_id=item["comment_id"],
                page_id=item.get("page_id"),
                parent_comment_id=item.get("parent_comment_id"),
                original_text=raw_text,         # Store redacted version for display
                original_text_raw=raw_text,      # Store raw for audit (same at this point; redaction is inside analyze_comment)
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
                intent_signal=analysis.intent_signal,
                raw_payload=payload,
            )
            if item.get("created_at"):
                record.created_at = datetime.datetime.fromtimestamp(item["created_at"])

            db.add(record)
            db.commit()
            db.refresh(record)

            # ── Evaluate routing rules ──────────────────────────────
            evaluate_alert_rules(record, db)

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
        # Try Redis DLQ first, then file DLQ as fallback
        try:
            dlq_item = {
                "payload": payload_str,
                "error": str(exc),
                "failed_at": time.time()
            }
            redis_client.lpush("meta_webhook_dlq", json.dumps(dlq_item))
            logger.info("Failed payload pushed to Redis DLQ (meta_webhook_dlq).")
        except Exception:
            # Redis also unavailable — write to local file DLQ
            _push_to_dlq(payload_str, str(exc))
    finally:
        db.close()


def drain_file_dlq() -> None:
    """
    On worker startup, re-process any payloads that were saved to the file-based DLQ
    (written when both the primary queue and Redis were unavailable).
    Uses exponential back-off between retries.
    """
    if not os.path.exists(DLQ_FILE):
        return

    logger.info(f"DLQ drain: processing items from {DLQ_FILE} ...")
    try:
        with open(DLQ_FILE, "r") as f:
            lines = f.readlines()
    except OSError:
        return

    if not lines:
        return

    remaining = []
    backoff = 1
    for line in lines:
        line = line.strip()
        if not line:
            continue
        try:
            entry = json.loads(line)
            process_webhook_payload(entry["payload"])
            logger.info("DLQ item reprocessed successfully.")
            backoff = 1  # reset on success
        except Exception as exc:
            logger.error(f"DLQ drain failed for item: {exc}. Will retry next startup.")
            remaining.append(line)
            time.sleep(backoff)
            backoff = min(backoff * 2, 30)

    # Rewrite file with only the items that still failed
    try:
        with open(DLQ_FILE, "w") as f:
            for line in remaining:
                f.write(line + "\n")
        if not remaining:
            logger.info("DLQ fully drained and cleared.")
        else:
            logger.warning(f"DLQ drain: {len(remaining)} items remain after retry.")
    except OSError as e:
        logger.error(f"Could not rewrite DLQ file: {e}")


def run_worker() -> None:
    # Step 1: Load custom vocabulary into in-memory cache
    vocab_load_from_db()
    logger.info("Custom vocabulary cache loaded.")

    # Step 2: Drain any file-based DLQ items from previous crashes
    drain_file_dlq()

    logger.info(f"Worker listening on Redis queue '{settings.redis_queue_key}'...")
    backoff = 1
    while True:
        try:
            result = redis_client.brpop(settings.redis_queue_key, timeout=5)
            if result:
                _, payload_str = result
                try:
                    process_webhook_payload(payload_str)
                    backoff = 1  # reset on successful processing
                except Exception as exc:
                    logger.error(f"Processing error: {exc}. Backing off {backoff}s.")
                    _push_to_dlq(payload_str, str(exc))
                    time.sleep(backoff)
                    backoff = min(backoff * 2, 60)
        except redis.exceptions.TimeoutError:
            continue
        except redis.ConnectionError as exc:
            logger.error(f"Redis connection error: {exc}. Retrying in {backoff}s...")
            time.sleep(backoff)
            backoff = min(backoff * 2, 60)
        except Exception as exc:
            logger.error(f"Worker error: {exc}")
            time.sleep(5)


if __name__ == "__main__":
    run_worker()

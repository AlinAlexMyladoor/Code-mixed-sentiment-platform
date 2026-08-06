import json
import redis
import time
from database import SessionLocal
from models import ProcessedComment

# Initialize Redis connection to match Phase 1
# Initialize Redis connection with health checks to prevent socket drops
redis_client = redis.Redis(host='localhost', port=6379, db=0, socket_keepalive=True, health_check_interval=30)

def detect_language_switching(text: str) -> float:
    """
    Calculates the proportion of English words in the text.
    Bilingual users alter language based on emotion; tracking this ratio 
    gauges brand intensity.
    """
    words = text.split()
    if not words:
        return 0.0
        
    # A simplified dictionary check for English characters vs regional indicators
    # In production, this would utilize a fast language-detection library per token
    english_word_count = sum(1 for word in words if word.isascii() and len(word) > 2)
    return round(english_word_count / len(words), 2)

def extract_entities_with_boundary_logic(text: str) -> dict:
    """
    Addresses the 'last mile' failure of LLMs by strictly defining entity boundaries 
    before passing them to downstream logic.
    """
    # Placeholder for the complex RegEx/NLP boundary logic applied to unstructured text
    return {"brands_mentioned": [], "key_phrases": []}

def classify_sarcasm_and_sentiment(text: str) -> str:
    """
    Interfaces with the PEFT/LoRA fine-tuned Llama 3 model (from Phase 2)
    to classify the text into: Positive, Negative, Neutral, or Sarcastic.
    """
    # For MVP worker logic, we simulate the model inference call.
    # In production, this fires an HTTP request to your local GPU serving the model.
    if "love" in text.lower():
        return "positive"
    elif "great" in text.lower() and "terrible" in text.lower():
        return "sarcastic" # Detecting the edge-case
    return "neutral"

def process_webhook_payload(payload_str: str):
    """
    The core pipeline executed on every incoming Meta comment.
    """
    payload = json.loads(payload_str)
    
    # Extracting the comment from Meta's nested JSON structure
    # (This structure varies depending on whether it's FB or Instagram)
    try:
        entries = payload.get("entry", [])
        for entry in entries:
            changes = entry.get("changes", [])
            for change in changes:
                value = change.get("value", {})
                comment_text = value.get("message", "")
                comment_id = value.get("comment_id", "unknown")
                
                if not comment_text:
                    continue

                print(f"\nProcessing Comment: {comment_text}")
                
                # 1. Boundary-Optimized Extraction
                entities = extract_entities_with_boundary_logic(comment_text)
                
                # 2. Sarcasm and Edge-Case Detection
                sentiment = classify_sarcasm_and_sentiment(comment_text)
                
                # 3. Sociolinguistic Analytics
                en_ratio = detect_language_switching(comment_text)
                
                # Save to PostgreSQL
                db = SessionLocal()
                new_record = ProcessedComment(
                    platform_id=comment_id,
                    original_text=comment_text,
                    extracted_entities=entities,
                    sentiment=sentiment,
                    english_ratio=en_ratio,
                    raw_payload=payload
                )
                db.add(new_record)
                db.commit()
                db.close()
                
                print(f"Result -> Sentiment: {sentiment} | EN Ratio: {en_ratio}")
                
    except Exception as e:
        print(f"Error processing payload: {e}")

def run_worker():
    print("Worker is listening for Meta Webhooks on Redis queue 'meta_webhook_queue'...")
    while True:
        try:
            # Use a 5-second timeout instead of 0 to prevent the OS from killing the idle socket
            result = redis_client.brpop("meta_webhook_queue", timeout=5)
            
            if result:
                queue_name, payload_str = result
                process_webhook_payload(payload_str.decode('utf-8'))
                
        except redis.exceptions.TimeoutError:
            # The 5 seconds passed without a message. Just loop back and listen again.
            continue
        except Exception as e:
            print(f"Worker encountered an error: {e}")
            time.sleep(5) # Pause briefly before retrying to prevent error spam

if __name__ == "__main__":
    run_worker()


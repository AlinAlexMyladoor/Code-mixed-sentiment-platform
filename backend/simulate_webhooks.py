import time
import requests
import random
import uuid

WEBHOOK_URL = "http://localhost:8000/webhook"

MESSAGES = [
    "I absolutely love this new product, it is amazing quality!",
    "The food was terrible and the service was incredibly slow.",
    "Oh great, another update that breaks everything. Just what I needed. 😒",
    "Customer service was completely unhelpful. waste of time.",
    "super quick delivery, perfectly packaged. thank you team!",
    "idhu romba nalla irukku. excellent build quality.",  # Tamil code-mixed
    "kya bakwas hai yaar, completely disappointed.",     # Hindi code-mixed
    "wow what a revolutionary feature... not. 🙄",      # Sarcastic
    "Not bad, pretty standard product. Does the job.",
    "Best purchase ever! will recommend to everyone."
]

def generate_payload(message: str) -> dict:
    return {
        "object": "page",
        "entry": [{
            "id": "page_123",
            "time": int(time.time()),
            "changes": [{
                "value": {
                    "message": message,
                    "comment_id": f"comment_{uuid.uuid4().hex[:8]}",
                },
                "field": "feed",
            }],
        }],
    }

def run_simulation(num_events=15, delay=1.5):
    print(f"Simulating {num_events} webhook events to {WEBHOOK_URL}...")
    
    for i in range(num_events):
        message = random.choice(MESSAGES)
        payload = generate_payload(message)
        
        try:
            resp = requests.post(WEBHOOK_URL, json=payload)
            if resp.status_code == 200:
                print(f"[{i+1}/{num_events}] Sent successfully -> {message[:40]}...")
            else:
                print(f"[{i+1}/{num_events}] Failed with status {resp.status_code}")
        except Exception as e:
            print(f"Failed to connect to backend: {e}")
            
        time.sleep(delay)

    print("Simulation complete! Check your dashboard.")

if __name__ == "__main__":
    run_simulation()

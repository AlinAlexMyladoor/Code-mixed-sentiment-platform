from fastapi import FastAPI, Request, HTTPException, BackgroundTasks
import uvicorn
import redis

app = FastAPI(title="Sentiment Platform API Gateway")

# Initialize Redis client (Ensure Redis is running locally or provide cloud URL)
redis_client = redis.Redis(host='localhost', port=6379, db=0)

# Replace with the verification token you set in the Meta Developer App
META_VERIFY_TOKEN = "your_secure_verify_token_here"

def push_to_queue(payload: dict):
    # Pushes the raw JSON webhook payload to the Redis queue for async processing
    # This prevents the API from timing out while communicating with Meta
    import json
    redis_client.lpush("meta_webhook_queue", json.dumps(payload))
    print("Payload pushed to Redis queue.")

@app.get("/webhook")
async def verify_webhook(request: Request):
    """
    Required by Meta to verify the webhook endpoint.
    """
    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")

    if mode and token:
        if mode == "subscribe" and token == META_VERIFY_TOKEN:
            print("Webhook Verified!")
            return int(challenge)
        else:
            raise HTTPException(status_code=403, detail="Verification token mismatch")
    
    raise HTTPException(status_code=400, detail="Bad Request")

@app.post("/webhook")
async def receive_webhook(request: Request, background_tasks: BackgroundTasks):
    """
    Receives real-time HTTP POST payloads whenever a comment is made.
    """
    try:
        payload = await request.json()
        
        # Immediately push to Redis queue via background task
        background_tasks.add_task(push_to_queue, payload)
        
        # Return 200 OK to Meta within seconds to prevent timeouts
        return {"status": "success", "message": "Payload received"}
    
    except Exception as e:
        print(f"Error receiving payload: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
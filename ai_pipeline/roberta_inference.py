"""
CPU-compatible RoBERTa inference server.
Uses cardiffnlp/twitter-roberta-base-sentiment-latest (~400 MB, no GPU needed).
Same API contract as inference_server.py — drop-in replacement for local dev.

Usage:
    pip install transformers torch
    python roberta_inference.py
    # Then set: INFERENCE_URL=http://localhost:8001/analyze  INFERENCE_MODE=roberta
"""

import re
import sys

import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(
    title="RoBERTa Code-Mixed Inference Engine (CPU)",
    description="twitter-roberta-base-sentiment with sarcasm overlay. CPU-compatible bridge to Llama 3.",
    version="1.0.0",
)

SARCASM_CUES = (
    "yeah right", "sure sure", "wow what a", "brilliant idea", "great job",
    "as if", "totally", "love how", "nice one", "oh really", "how wonderful",
    "so helpful", "so great", "perfectly done", "oh perfect", "wow so good",
)
SARCASM_EMOJI = re.compile(r"[🙄😒😏🤦🤷😬😑]")

MODEL_NAME = "cardiffnlp/twitter-roberta-base-sentiment-latest"
LABEL_MAP  = {"positive": "positive", "negative": "negative", "neutral": "neutral"}

_pipeline = None


def load_pipeline():
    global _pipeline
    try:
        from transformers import pipeline as hf_pipeline
        print(f"Loading {MODEL_NAME}...")
        _pipeline = hf_pipeline(
            "text-classification",
            model=MODEL_NAME,
            tokenizer=MODEL_NAME,
            top_k=None,            # return all label scores
        )
        print("✅ RoBERTa model ready.")
    except Exception as exc:
        print(f"❌ Failed to load RoBERTa: {exc}")
        _pipeline = None


class InferenceRequest(BaseModel):
    text: str


class InferenceResponse(BaseModel):
    sentiment:   str
    confidence:  float
    label_probs: dict[str, float]
    source:      str = "roberta_cpu"


def _check_sarcasm(text: str) -> bool:
    lower = text.lower()
    cue_hits = sum(1 for c in SARCASM_CUES if c in lower)
    emoji_hits = len(SARCASM_EMOJI.findall(text))
    return (cue_hits + emoji_hits) >= 1


def _fallback_heuristic(text: str) -> InferenceResponse:
    """Simple fallback when model is not available."""
    lower = text.lower()
    pos = sum(1 for w in ["love", "great", "amazing", "excellent", "perfect", "fantastic"] if w in lower)
    neg = sum(1 for w in ["terrible", "worst", "hate", "awful", "bad", "horrible"] if w in lower)
    sarc = _check_sarcasm(text)

    if sarc and pos > 0:
        return InferenceResponse(sentiment="sarcastic", confidence=0.72, label_probs={"sarcastic": 0.72, "positive": 0.15, "negative": 0.08, "neutral": 0.05}, source="heuristic_fallback")
    if neg > pos:
        conf = min(0.92, 0.55 + neg * 0.08)
        return InferenceResponse(sentiment="negative", confidence=conf, label_probs={"negative": conf, "positive": 0.05, "neutral": 1-conf-0.05, "sarcastic": 0.02}, source="heuristic_fallback")
    if pos > neg:
        conf = min(0.92, 0.55 + pos * 0.08)
        return InferenceResponse(sentiment="positive", confidence=conf, label_probs={"positive": conf, "negative": 0.05, "neutral": 1-conf-0.05, "sarcastic": 0.02}, source="heuristic_fallback")
    return InferenceResponse(sentiment="neutral", confidence=0.48, label_probs={"neutral": 0.48, "positive": 0.25, "negative": 0.22, "sarcastic": 0.05}, source="heuristic_fallback")


@app.on_event("startup")
async def startup():
    load_pipeline()


@app.get("/health")
async def health():
    return {"status": "healthy", "model_loaded": _pipeline is not None, "model": MODEL_NAME}


@app.post("/analyze", response_model=InferenceResponse)
async def analyze(req: InferenceRequest):
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    if _pipeline is None:
        return _fallback_heuristic(text)

    try:
        # Get all label probabilities
        results = _pipeline(text[:512], truncation=True)[0]
        # results is a list of {label, score} dicts when top_k=None
        label_probs_raw = {r["label"].lower(): float(r["score"]) for r in results}

        # Map to our 4-class system
        label_probs = {
            "positive":  label_probs_raw.get("positive", 0.0),
            "negative":  label_probs_raw.get("negative", 0.0),
            "neutral":   label_probs_raw.get("neutral",  0.0),
            "sarcastic": 0.0,
        }

        # Sarcasm override
        if _check_sarcasm(text) and label_probs["positive"] > label_probs["negative"]:
            top_sentiment = "sarcastic"
            confidence    = min(0.92, label_probs["positive"] * 0.85)
            label_probs["sarcastic"] = confidence
            label_probs["positive"] *= 0.15
        else:
            top_sentiment = max(["positive", "negative", "neutral"], key=lambda k: label_probs[k])
            confidence    = label_probs[top_sentiment]

        return InferenceResponse(
            sentiment=top_sentiment,
            confidence=confidence,
            label_probs=label_probs,
        )
    except Exception as exc:
        print(f"RoBERTa inference error: {exc}")
        return _fallback_heuristic(text)


@app.post("/predict", response_model=InferenceResponse)
async def predict(req: InferenceRequest):
    return await analyze(req)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)

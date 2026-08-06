"""
Lightweight inference API for fine-tuned Llama 3 LoRA adapters.
Run on a GPU host; point backend INFERENCE_URL to this service.
Falls back to heuristic classification when adapters are not present.
"""

import os

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="Code-Mixed Sentiment Inference")


class AnalyzeRequest(BaseModel):
    text: str


class AnalyzeResponse(BaseModel):
    sentiment: str
    confidence: float
    model: str


def _load_model():
    adapter_path = os.getenv("LORA_ADAPTER_PATH", "./llama3-codemixed-lora")
    model_name = os.getenv("BASE_MODEL", "meta-llama/Meta-Llama-3-8B")
    if not os.path.isdir(adapter_path):
        return None, None
    try:
        import torch
        from peft import PeftModel
        from transformers import AutoModelForCausalLM, AutoTokenizer

        tokenizer = AutoTokenizer.from_pretrained(model_name)
        base = AutoModelForCausalLM.from_pretrained(
            model_name, load_in_8bit=True, device_map="auto"
        )
        model = PeftModel.from_pretrained(base, adapter_path)
        return model, tokenizer
    except Exception as exc:
        print(f"Model load skipped: {exc}")
        return None, None


MODEL, TOKENIZER = _load_model()


def heuristic(text: str) -> tuple[str, float]:
    from pathlib import Path
    import sys

    sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
    from inference import classify_sarcasm_and_sentiment

    return classify_sarcasm_and_sentiment(text)


def llama_classify(text: str) -> tuple[str, float]:
    if MODEL is None or TOKENIZER is None:
        return heuristic(text)

    prompt = (
        "Analyze the sentiment of this code-mixed text. "
        "Reply with one word: positive, negative, neutral, or sarcastic.\n"
        f"Text: {text}\nSentiment:"
    )
    import torch

    inputs = TOKENIZER(prompt, return_tensors="pt").to(MODEL.device)
    with torch.no_grad():
        output = MODEL.generate(**inputs, max_new_tokens=8)
    decoded = TOKENIZER.decode(output[0], skip_special_tokens=True)
    tail = decoded.split("Sentiment:")[-1].strip().lower()
    for label in ("sarcastic", "negative", "positive", "neutral"):
        if label in tail:
            return label, 0.82
    return heuristic(text)


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest):
    sentiment, confidence = llama_classify(req.text)
    model_name = "llama3-lora" if MODEL else "heuristic_fallback"
    return AnalyzeResponse(sentiment=sentiment, confidence=confidence, model=model_name)


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": MODEL is not None}

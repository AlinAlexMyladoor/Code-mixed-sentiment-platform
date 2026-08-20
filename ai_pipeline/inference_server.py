"""
Llama 3 LoRA Inference Server — GPU deployment.
Runs on port 8001, provides /analyze endpoint compatible with backend INFERENCE_URL.

Usage:
    python inference_server.py --model ./llama3-code-mixed-lora
    # Then set: INFERENCE_URL=http://localhost:8001/analyze  INFERENCE_MODE=llama
"""

import argparse
import re
import sys

import torch
import threading
import uvicorn
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from peft import PeftModel

import os
from dotenv import load_dotenv

load_dotenv()

# ─── CLI ─────────────────────────────────────────────────────────────────────
parser = argparse.ArgumentParser()
parser.add_argument("--model",  default=os.getenv("LORA_MODEL_ID", "my-hf-org/llama3-code-mixed-lora"), help="HF Hub Repo ID or Path to LoRA adapter directory")
parser.add_argument("--base",   default="meta-llama/Meta-Llama-3-8B-Instruct", help="Base model name")
parser.add_argument("--port",   type=int, default=8001)
parser.add_argument("--host",   default="0.0.0.0")
args = parser.parse_args() if "--" not in sys.argv else argparse.Namespace(
    model=os.getenv("LORA_MODEL_ID", "my-hf-org/llama3-code-mixed-lora"), base="meta-llama/Meta-Llama-3-8B-Instruct", port=8001, host="0.0.0.0"
)

LABELS = ["positive", "negative", "neutral", "sarcastic"]

SYSTEM_PROMPT = (
    "You are a multilingual sentiment analysis expert specializing in code-mixed text "
    "where English is mixed with Romanized regional languages (Tamil, Malayalam, Hindi, Bengali). "
    "Classify the sentiment as exactly one of: positive, negative, neutral, sarcastic."
)

# ─── App ─────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Llama 3 Code-Mixed Inference Engine",
    description="LoRA fine-tuned Llama 3 8B for multilingual code-mixed sentiment analysis",
    version="1.0.0",
)

# ─── Global model state ───────────────────────────────────────────────────────
_model     = None
_tokenizer = None


def load_model():
    global _model, _tokenizer
    if not torch.cuda.is_available():
        raise RuntimeError("GPU required for Llama 3 inference. Use roberta_inference.py for CPU.")

    print("Loading tokenizer...")
    _tokenizer = AutoTokenizer.from_pretrained(args.base, use_fast=True)
    _tokenizer.pad_token = _tokenizer.eos_token

    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16,
    )

    print("Loading base model in 4-bit...")
    base = AutoModelForCausalLM.from_pretrained(
        args.base,
        quantization_config=bnb_config,
        device_map="auto",
    )

    print(f"Applying LoRA weights from {args.model}...")
    _model = PeftModel.from_pretrained(base, args.model)
    _model.eval()
    print("✅ Model ready.")


# ─── Request / Response schemas ──────────────────────────────────────────────
class InferenceRequest(BaseModel):
    text: str


class InferenceResponse(BaseModel):
    sentiment:   str
    confidence:  float
    label_probs: dict[str, float]
    source:      str = "llama_lora"


# ─── Inference logic ─────────────────────────────────────────────────────────
def _parse_label(response_text: str) -> tuple[str, float]:
    """Extract the first recognized label from generated text."""
    lower = response_text.lower()
    for label in LABELS:
        if label in lower:
            return label, 0.90
    return "neutral", 0.50


def _run_inference(text: str) -> InferenceResponse:
    prompt = (
        f"<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n"
        f"{SYSTEM_PROMPT}<|eot_id|>"
        f"<|start_header_id|>user<|end_header_id|>\n"
        f"Classify the sentiment of this code-mixed comment:\n\"{text}\"<|eot_id|>"
        f"<|start_header_id|>assistant<|end_header_id|>\n"
    )
    inputs = _tokenizer(prompt, return_tensors="pt", truncation=True, max_length=512).to("cuda")

    with torch.no_grad():
        outputs = _model.generate(
            **inputs,
            max_new_tokens=8,
            temperature=0.1,
            do_sample=False,
            pad_token_id=_tokenizer.eos_token_id,
        )

    # Decode only the newly generated tokens
    new_tokens = outputs[0][inputs["input_ids"].shape[-1]:]
    response   = _tokenizer.decode(new_tokens, skip_special_tokens=True).strip()
    sentiment, confidence = _parse_label(response)

    # Placeholder label_probs (true logit extraction would need custom generation)
    label_probs = {l: 0.05 for l in LABELS}
    label_probs[sentiment] = confidence

    return InferenceResponse(
        sentiment=sentiment,
        confidence=confidence,
        label_probs=label_probs,
    )


# ─── Routes ──────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    print("Initiating background model load...")
    thread = threading.Thread(target=load_model)
    thread.start()

@app.get("/health")
async def health():
    return {"status": "healthy", "model_loaded": _model is not None}


@app.post("/analyze", response_model=InferenceResponse)
async def analyze(req: InferenceRequest):
    if _model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    return _run_inference(req.text[:1000])


@app.post("/predict", response_model=InferenceResponse)
async def predict(req: InferenceRequest):
    """Alias for /analyze."""
    return await analyze(req)


if __name__ == "__main__":
    uvicorn.run(app, host=args.host, port=args.port)
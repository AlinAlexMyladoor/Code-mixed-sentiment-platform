"""
Boundary-optimized extraction, sarcasm-aware sentiment, and sociolinguistic metrics.

Inference modes (set via INFERENCE_MODE env var):
  heuristic  — default; fast rule-based engine
  roberta    — cardiffnlp RoBERTa (CPU, ~400 MB); automatically falls back to heuristic
  llama      — Llama 3 LoRA server at INFERENCE_URL (GPU)
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass, field
from typing import Optional

import httpx

# ─────────────────────────────────────────────
# Lexicon bank (Tamil · Malayalam · Hindi · Bengali — Romanized)
# ─────────────────────────────────────────────

SARCASM_CUES = (
    "yeah right", "sure sure", "wow what a", "brilliant idea", "great job",
    "as if", "totally", "love how", "nice one", "oh really", "oh wow",
    "thanks a lot", "amazing job", "wonderful", "how wonderful", "so helpful",
    "so useful", "so great", "perfectly done", "oh perfect", "wow so good",
    "very helpful", "super helpful", "excellent service", "such a deal",
    "what a bargain", "best ever", "totally worth it", "incredible value",
    "really impressive", "mind blowing", "who could have thought",
)

NEGATIVE_CUES = (
    "terrible", "worst", "hate", "slow", "bad", "awful", "disappointed",
    "never again", "refund", "pathetic", "horrible", "disgusting", "fraud",
    "scam", "cheating", "waste", "useless", "broken", "defective", "damaged",
    "missing", "wrong", "incorrect", "delayed", "late", "rude", "unhelpful",
    "unresponsive", "ignored", "cheated", "lied", "stealing", "robbery",
    "overpriced", "regret", "mistake", "failure", "disaster", "catastrophe",
    "appalling", "unacceptable", "shocking", "outrageous", "ridiculous",
    # Romanized negative cues — Tamil
    "romba mosam", "ketta", "bayangara mosam", "waste panra", "illa da seri",
    "paavam", "enna da idhu", "theriyama", "kelvi kekka mudiyala",
    # Romanized negative cues — Malayalam
    "mോsha", "mosham", "moshamayi", "cheriya", "nallatalla", "prashnam",
    "prashnamaanu", "avarude seva moshamaanu",
    # Romanized negative cues — Hindi
    "bahut kharab", "bekar", "kachra", "bura", "ganda", "faltu", "nakli",
    "dhoka", "bakwaas", "nahi chalega", "bekaar", "pagal",
    # Romanized negative cues — Bengali
    "khub kharap", "baje", "nosto", "byartho", "dukkhojonok",
)

POSITIVE_CUES = (
    "love", "amazing", "excellent", "great", "fantastic", "thank", "happy",
    "best", "awesome", "perfect", "wonderful", "superb", "outstanding",
    "brilliant", "delighted", "pleased", "satisfied", "impressed", "loved",
    "recommend", "beautiful", "gorgeous", "fast", "quick", "reliable",
    "trustworthy", "honest", "genuine", "quality", "premium", "fresh",
    # Romanized positive cues — Tamil
    "romba nalla", "super ah iruku", "nalla irundhuchu", "en mela trust",
    "sema", "ipdi irukanum", "kollam", "anbudan", "mela sontham",
    # Romanized positive cues — Malayalam
    "njan happy", "kollam", "adipoli", "super", "enthayalum nalla",
    "nallathayi", "valare nalla", "superb aayirunnu",
    # Romanized positive cues — Hindi
    "bahut accha", "accha hai", "bahut badhiya", "bilkul sahi", "sahi hai",
    "mast hai", "zabardast", "lajawaab", "wah wah", "shandar",
    # Romanized positive cues — Bengali
    "khub bhalo", "onek valo", "darun", "oshadharon", "sundor",
)

NEUTRAL_CUES = (
    "okay", "ok", "average", "normal", "alright", "fine", "decent",
    "so-so", "moderate", "acceptable",
    "theek hai", "sari", "seri",
)

# Regional token pattern (Tamil · Malayalam · Hindi · Bengali Romanized)
REGIONAL_ROMAN_TOKENS = re.compile(
    r"\b("
    # Tamil
    r"enna|romba|nalla|sari|illa|ve|da|dei|machan|sema|ipdi|endha|yenda|"
    r"paakanum|paaru|solladu|adhukkaga|theriyum|theriyaadhu|"
    # Malayalam
    r"njan|ningal|enth|pinne|kollam|aanu|undo|alla|adipoli|"
    r"engane|ivide|avide|samsaram|valare|ithu|ethu|"
    # Hindi
    r"bahut|bohot|accha|kharab|nahi|yaar|bhai|hai|hain|kya|"
    r"matlab|zaroor|bilkul|theek|thik|mast|zyada|"
    # Bengali
    r"ami|tumi|apni|bhalo|kharap|ektu|onek|darun|"
    r"khub|kintu|tahole|ekhon|diye|kore"
    r")\b",
    re.IGNORECASE,
)

# Emoji patterns
POSITIVE_EMOJI = re.compile(r"[😀😃😄😁😆😊🙂🤩😍🥰❤️💕👍✅🌟⭐🎉🎊]")
NEGATIVE_EMOJI = re.compile(r"[😠😡🤬😤😢😭😞👎❌🚫💔😰😨]")
SARCASM_EMOJI  = re.compile(r"[🙄😒😏🤦🤷😬😑]")

HASHTAG_MENTION = re.compile(r"[@#][\w.]+")
URL_PATTERN     = re.compile(r"https?://\S+|www\.\S+")
MULTISPACE      = re.compile(r"\s+")
QUESTION_RE     = re.compile(r"\?{2,}")          # multiple ? → frustration
CAPS_RE         = re.compile(r"\b[A-Z]{4,}\b")   # all-caps words


@dataclass
class AnalysisResult:
    sentiment: str
    english_ratio: float
    language_switch_count: int
    extracted_entities: dict
    confidence: float
    source: str
    sarcasm_signals: list[str] = field(default_factory=list)
    regional_tokens_found: list[str] = field(default_factory=list)


# ─────────────────────────────────────────────
# Text preprocessing
# ─────────────────────────────────────────────

def normalize_text(text: str) -> str:
    text = URL_PATTERN.sub(" ", text)
    text = HASHTAG_MENTION.sub(" ", text)
    text = MULTISPACE.sub(" ", text).strip()
    return text


def tokenize_mixed(text: str) -> list[tuple[str, str]]:
    """Label each token as english | regional_roman | emoji | other."""
    tokens: list[tuple[str, str]] = []
    for raw in text.split():
        word = re.sub(r"[^\w']", "", raw)
        if not word:
            # check emoji separately
            emojis = re.findall(r"[^\w\s]", raw)
            for e in emojis:
                tokens.append((e, "emoji"))
            continue
        lower = word.lower()
        if REGIONAL_ROMAN_TOKENS.search(lower):
            tokens.append((word, "regional_roman"))
        elif word.isascii() and re.search(r"[a-zA-Z]", word):
            tokens.append((word, "english"))
        else:
            tokens.append((word, "other"))
    return tokens


# ─────────────────────────────────────────────
# Sociolinguistic metrics
# ─────────────────────────────────────────────

def detect_language_switching(text: str) -> tuple[float, int]:
    tokens = tokenize_mixed(text)
    if not tokens:
        return 0.0, 0

    word_tokens = [(t, l) for t, l in tokens if l != "emoji"]
    if not word_tokens:
        return 0.0, 0

    english_count = sum(1 for _, lang in word_tokens if lang == "english")
    english_ratio = round(english_count / len(word_tokens), 3)

    switches = 0
    prev = word_tokens[0][1]
    for _, lang in word_tokens[1:]:
        if (
            lang != prev
            and lang in ("english", "regional_roman")
            and prev in ("english", "regional_roman")
        ):
            switches += 1
        prev = lang

    return english_ratio, switches


def find_regional_tokens(text: str) -> list[str]:
    return [m.group(0).lower() for m in REGIONAL_ROMAN_TOKENS.finditer(text)]


# ─────────────────────────────────────────────
# Entity extraction with boundary logic
# ─────────────────────────────────────────────

def extract_entities_with_boundary_logic(text: str) -> dict:
    """
    Boundary-optimized extraction: normalize spans before entity detection
    to reduce LLM-style boundary corruption on messy Romanized input.
    """
    cleaned = normalize_text(text)
    tokens  = tokenize_mixed(cleaned)

    # Brand-like: Title-cased multi-word sequences ≥3 chars
    brands: list[str] = []
    for match in re.finditer(r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b", cleaned):
        candidate = match.group(1).strip()
        if len(candidate) > 2:
            brands.append(candidate)

    key_phrases: list[str] = []
    for cue in POSITIVE_CUES + NEGATIVE_CUES + SARCASM_CUES:
        if cue in cleaned.lower():
            key_phrases.append(cue)

    regional_found = find_regional_tokens(cleaned)

    return {
        "brands_mentioned":   sorted(set(brands))[:10],
        "key_phrases":        sorted(set(key_phrases))[:15],
        "regional_tokens":    sorted(set(regional_found))[:15],
        "token_language_tags": [{"token": t, "lang": l} for t, l in tokens[:60]],
    }


# ─────────────────────────────────────────────
# Heuristic sentiment classifier
# ─────────────────────────────────────────────

def _heuristic_sentiment(text: str) -> tuple[str, float, list[str]]:
    lower   = text.lower()
    signals: list[str] = []

    # Emoji signals
    pos_emoji_count  = len(POSITIVE_EMOJI.findall(text))
    neg_emoji_count  = len(NEGATIVE_EMOJI.findall(text))
    sarc_emoji_count = len(SARCASM_EMOJI.findall(text))

    sarcasm_score = sum(1 for c in SARCASM_CUES  if c in lower) + sarc_emoji_count
    neg_score     = sum(1 for c in NEGATIVE_CUES  if c in lower) + neg_emoji_count
    pos_score     = sum(1 for c in POSITIVE_CUES  if c in lower) + pos_emoji_count

    # Caps frustration signal
    caps_words = CAPS_RE.findall(text)
    if caps_words:
        neg_score += 0.5
        signals.append(f"all-caps: {caps_words[:3]}")

    # Multiple question marks
    if QUESTION_RE.search(text):
        neg_score += 0.5
        signals.append("multiple-question-marks")

    # Sarcasm: positive cues + sarcasm marker OR exclamation after obvious praise
    if sarcasm_score > 0 and (pos_score > 0 or "!" in text):
        signals.append("sarcasm-cue-detected")
        conf = min(0.95, 0.55 + sarcasm_score * 0.1)
        return "sarcastic", conf, signals

    if neg_score > pos_score:
        conf = min(0.95, 0.50 + (neg_score - pos_score) * 0.08)
        return "negative", conf, signals

    if pos_score > neg_score:
        conf = min(0.95, 0.50 + (pos_score - neg_score) * 0.08)
        return "positive", conf, signals

    return "neutral", 0.45, signals


# ─────────────────────────────────────────────
# RoBERTa inference (CPU-compatible)
# ─────────────────────────────────────────────

_roberta_pipeline: Optional[object] = None


def _load_roberta():
    global _roberta_pipeline
    if _roberta_pipeline is not None:
        return _roberta_pipeline
    try:
        from transformers import pipeline as hf_pipeline
        _roberta_pipeline = hf_pipeline(
            "text-classification",
            model="cardiffnlp/twitter-roberta-base-sentiment-latest",
            tokenizer="cardiffnlp/twitter-roberta-base-sentiment-latest",
        )
        return _roberta_pipeline
    except Exception as exc:
        print(f"[roberta] Failed to load model: {exc}")
        return None


_ROBERTA_LABEL_MAP = {
    "positive": "positive",
    "negative": "negative",
    "neutral":  "neutral",
}


def _roberta_sentiment(text: str) -> tuple[str, float]:
    pipe = _load_roberta()
    if pipe is None:
        return _heuristic_sentiment(text)[:2]
    try:
        # RoBERTa max 512 tokens; clip text
        result = pipe(text[:512], truncation=True)[0]
        label = _ROBERTA_LABEL_MAP.get(result["label"].lower(), "neutral")
        score = float(result["score"])

        # Check for sarcasm on top of roberta neutral/positive
        lower = text.lower()
        sarc  = sum(1 for c in SARCASM_CUES if c in lower)
        sarc += len(SARCASM_EMOJI.findall(text))
        if sarc > 0 and label in ("positive", "neutral"):
            return "sarcastic", min(0.92, score * 0.8 + sarc * 0.05)

        return label, score
    except Exception:
        return _heuristic_sentiment(text)[:2]


# ─────────────────────────────────────────────
# Llama / external inference service
# ─────────────────────────────────────────────

def _llama_sentiment(text: str, url: str) -> tuple[str, float]:
    try:
        with httpx.Client(timeout=30.0) as client:
            resp = client.post(url, json={"text": text})
            resp.raise_for_status()
            data = resp.json()
            sentiment  = data.get("sentiment", "neutral").lower()
            confidence = float(data.get("confidence", 0.5))
            return sentiment, confidence
    except Exception:
        return _heuristic_sentiment(text)[:2]


# ─────────────────────────────────────────────
# Main dispatch
# ─────────────────────────────────────────────

def classify_sarcasm_and_sentiment(text: str) -> tuple[str, float, str, list[str]]:
    """
    Returns (sentiment, confidence, source, sarcasm_signals).
    """
    mode = os.getenv("INFERENCE_MODE", "heuristic").lower()

    if mode == "llama":
        url = os.getenv("INFERENCE_URL", "")
        if url:
            sentiment, conf = _llama_sentiment(text, url)
            return sentiment, conf, "llama_lora", []

    if mode == "roberta":
        sentiment, conf = _roberta_sentiment(text)
        return sentiment, conf, "roberta_cpu", []

    # Default heuristic
    sentiment, conf, signals = _heuristic_sentiment(text)
    return sentiment, conf, "heuristic_mvp", signals


def analyze_comment(text: str) -> AnalysisResult:
    cleaned   = normalize_text(text)
    entities  = extract_entities_with_boundary_logic(cleaned)
    sentiment, confidence, source, signals = classify_sarcasm_and_sentiment(cleaned)
    english_ratio, switch_count = detect_language_switching(cleaned)
    regional  = find_regional_tokens(cleaned)

    return AnalysisResult(
        sentiment=sentiment,
        english_ratio=english_ratio,
        language_switch_count=switch_count,
        extracted_entities=entities,
        confidence=confidence,
        source=source,
        sarcasm_signals=signals,
        regional_tokens_found=regional,
    )

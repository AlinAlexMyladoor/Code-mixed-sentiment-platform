"""
Boundary-optimized extraction, sarcasm-aware sentiment, and sociolinguistic metrics.
Uses a local heuristic engine by default; delegates to INFERENCE_URL when configured.
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass

import httpx

SARCASM_CUES = (
    "yeah right",
    "sure sure",
    "wow what a",
    "brilliant idea",
    "great job",
    "as if",
    "totally",
    "love how",
    "nice one",
)
NEGATIVE_CUES = (
    "terrible",
    "worst",
    "hate",
    "slow",
    "bad",
    "awful",
    "disappointed",
    "never again",
    "refund",
    "pathetic",
)
POSITIVE_CUES = (
    "love",
    "amazing",
    "excellent",
    "great",
    "fantastic",
    "thank",
    "happy",
    "best",
    "awesome",
    "perfect",
)

# Common Romanized regional tokens (Tamil/Malayalam/Hindi mix in Roman script)
REGIONAL_ROMAN_TOKENS = re.compile(
    r"\b("
    r"enna|romba|nalla|sari|illa|ve|da|dei|machan|"
    r"njan|ningal|enth|pinne|kollam|"
    r"bahut|bohot|accha|kharab|nahi|"
    r"entha|chey|pannu"
    r")\b",
    re.IGNORECASE,
)

HASHTAG_MENTION = re.compile(r"[@#][\w.]+")
URL_PATTERN = re.compile(r"https?://\S+|www\.\S+")
MULTISPACE = re.compile(r"\s+")


@dataclass
class AnalysisResult:
    sentiment: str
    english_ratio: float
    language_switch_count: int
    extracted_entities: dict
    confidence: float
    source: str


def normalize_text(text: str) -> str:
    text = URL_PATTERN.sub(" ", text)
    text = HASHTAG_MENTION.sub(" ", text)
    text = MULTISPACE.sub(" ", text).strip()
    return text


def tokenize_mixed(text: str) -> list[tuple[str, str]]:
    """Label each token as english, regional_roman, or other."""
    tokens: list[tuple[str, str]] = []
    for raw in text.split():
        word = re.sub(r"[^\w']", "", raw)
        if not word:
            continue
        lower = word.lower()
        if REGIONAL_ROMAN_TOKENS.search(lower):
            tokens.append((word, "regional_roman"))
        elif word.isascii() and re.search(r"[a-zA-Z]", word):
            tokens.append((word, "english"))
        else:
            tokens.append((word, "other"))
    return tokens


def detect_language_switching(text: str) -> tuple[float, int]:
    tokens = tokenize_mixed(text)
    if not tokens:
        return 0.0, 0

    english_count = sum(1 for _, lang in tokens if lang == "english")
    english_ratio = round(english_count / len(tokens), 3)

    switches = 0
    prev = tokens[0][1]
    for _, lang in tokens[1:]:
        if lang != prev and lang in ("english", "regional_roman") and prev in (
            "english",
            "regional_roman",
        ):
            switches += 1
        prev = lang

    return english_ratio, switches


def extract_entities_with_boundary_logic(text: str) -> dict:
    """
    Boundary-optimized extraction: normalize spans before entity detection
    to reduce LLM-style boundary corruption on messy Romanized input.
    """
    cleaned = normalize_text(text)
    tokens = tokenize_mixed(cleaned)

    brands: list[str] = []
    for match in re.finditer(r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b", cleaned):
        candidate = match.group(1).strip()
        if len(candidate) > 2:
            brands.append(candidate)

    key_phrases: list[str] = []
    for cue in POSITIVE_CUES + NEGATIVE_CUES + SARCASM_CUES:
        if cue in cleaned.lower():
            key_phrases.append(cue)

    return {
        "brands_mentioned": sorted(set(brands))[:10],
        "key_phrases": sorted(set(key_phrases))[:10],
        "token_language_tags": [{"token": t, "lang": l} for t, l in tokens[:50]],
    }


def _heuristic_sentiment(text: str) -> tuple[str, float]:
    lower = text.lower()
    sarcasm_score = sum(1 for c in SARCASM_CUES if c in lower)
    neg_score = sum(1 for c in NEGATIVE_CUES if c in lower)
    pos_score = sum(1 for c in POSITIVE_CUES if c in lower)

    if sarcasm_score > 0 and (pos_score > 0 or "!" in text):
        return "sarcastic", min(0.95, 0.55 + sarcasm_score * 0.1)

    if neg_score > pos_score:
        return "negative", min(0.95, 0.5 + neg_score * 0.08)
    if pos_score > neg_score:
        return "positive", min(0.95, 0.5 + pos_score * 0.08)
    return "neutral", 0.45


def classify_sarcasm_and_sentiment(text: str) -> tuple[str, float]:
    inference_url = os.getenv("INFERENCE_URL")
    if inference_url:
        try:
            with httpx.Client(timeout=30.0) as client:
                resp = client.post(inference_url, json={"text": text})
                resp.raise_for_status()
                data = resp.json()
                return data.get("sentiment", "neutral"), float(data.get("confidence", 0.5))
        except Exception:
            pass
    return _heuristic_sentiment(text)


def analyze_comment(text: str) -> AnalysisResult:
    cleaned = normalize_text(text)
    entities = extract_entities_with_boundary_logic(cleaned)
    sentiment, confidence = classify_sarcasm_and_sentiment(cleaned)
    english_ratio, switch_count = detect_language_switching(cleaned)

    source = "inference_service" if os.getenv("INFERENCE_URL") else "heuristic_mvp"
    return AnalysisResult(
        sentiment=sentiment,
        english_ratio=english_ratio,
        language_switch_count=switch_count,
        extracted_entities=entities,
        confidence=confidence,
        source=source,
    )

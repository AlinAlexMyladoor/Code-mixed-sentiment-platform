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
    sarcasm_score: float = 0.0              # NEW: continuous sarcasm confidence 0.0–1.0
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

# ─────────────────────────────────────────────
# Boundary Extraction with Quality Scoring
# ─────────────────────────────────────────────

def score_entity_boundary(candidate: str, tokens: list[tuple[str, str]]) -> float:
    """
    Score a candidate entity span 0.0–1.0 for boundary quality.
    Penalises spans that cut mid-code-mix phrase or start/end with regional tokens.
    """
    if not candidate:
        return 0.0
    words = candidate.split()
    if not words:
        return 0.0

    # Build a token-language lookup from the full tokenised text
    lang_map = {t.lower(): l for t, l in tokens}

    first_lang = lang_map.get(words[0].lower(), "english")
    last_lang  = lang_map.get(words[-1].lower(), "english")

    score = 1.0
    # Penalise if boundary starts/ends inside regional token run
    if first_lang == "regional_roman":
        score -= 0.3
    if last_lang == "regional_roman":
        score -= 0.3
    # Penalise very short spans (likely noise)
    if len(candidate) < 3:
        score -= 0.5
    # Boost multi-word spans (more specific)
    if len(words) >= 2:
        score += 0.1
    return max(0.0, min(1.0, score))


def detect_phantom_boundaries(candidate: str, original_text: str) -> bool:
    """
    Detect if the extracted entity string was silently split from its
    code-mixed context — i.e., it appears mid-word in the original.
    Returns True if the boundary is 'phantom' (corrupted).
    """
    if not candidate or len(candidate) < 3:
        return False
    idx = original_text.lower().find(candidate.lower())
    if idx == -1:
        return True  # not found at all — extraction hallucinated
    # Check character before the match
    if idx > 0 and original_text[idx - 1].isalpha():
        return True  # mid-word split
    # Check character after the match
    end = idx + len(candidate)
    if end < len(original_text) and original_text[end].isalpha():
        return True  # truncated
    return False


def extract_entities_with_boundary_logic(text: str) -> dict:
    """
    Boundary-optimised extraction with quality scoring and phantom-boundary detection.
    Low-quality extractions are flagged rather than silently discarded.
    """
    cleaned = normalize_text(text)
    tokens  = tokenize_mixed(cleaned)

    # Brand-like: Title-cased multi-word sequences ≥3 chars
    raw_brands: list[str] = []
    for match in re.finditer(r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b", cleaned):
        candidate = match.group(1).strip()
        if len(candidate) > 2:
            raw_brands.append(candidate)

    # Score each brand and filter out phantom/low-quality boundaries
    quality_brands: list[dict] = []
    seen_brands: set[str] = set()
    for brand in raw_brands:
        if brand in seen_brands:
            continue
        seen_brands.add(brand)
        bq = score_entity_boundary(brand, tokens)
        phantom = detect_phantom_boundaries(brand, cleaned)
        quality_brands.append({
            "name":    brand,
            "quality": round(bq, 2),
            "phantom": phantom,
        })

    # Only expose reliable brands to downstream analytics
    reliable_brands = [
        b["name"] for b in quality_brands
        if not b["phantom"] and b["quality"] >= 0.5
    ][:10]

    key_phrases: list[str] = []
    for cue in POSITIVE_CUES + NEGATIVE_CUES + SARCASM_CUES:
        if cue in cleaned.lower():
            key_phrases.append(cue)

    regional_found = find_regional_tokens(cleaned)

    return {
        "brands_mentioned":    reliable_brands,
        "key_phrases":         sorted(set(key_phrases))[:15],
        "regional_tokens":     sorted(set(regional_found))[:15],
        "token_language_tags": [{"token": t, "lang": l} for t, l in tokens[:60]],
        "boundary_quality":    [
            {k: v for k, v in b.items()} for b in quality_brands[:10]
        ],
    }


# ─────────────────────────────────────────────
# Deep Sarcasm Detection — 4-Signal Float Scorer
# ─────────────────────────────────────────────

INTENSIFIERS = (
    "very", "so", "absolutely", "totally", "completely", "utterly", "incredibly",
    "extremely", "truly", "really", "such a", "what a",
)

CONTRADICTION_PAIRS = [
    (POSITIVE_CUES, ("but", "however", "yet", "though", "although", "except")),
]


def _tonal_incongruity_score(text: str, pos_score: float, neg_score: float) -> float:
    """High positive lexical load in a context with negative framing signals sarcasm."""
    if pos_score <= 0:
        return 0.0
    lower = text.lower()
    # Positive words + negative tone markers together
    neg_markers = sum(1 for m in ("terrible", "worst", "broken", "failed", "late", "wrong") if m in lower)
    if pos_score >= 2 and neg_markers >= 1:
        return min(0.6, 0.25 * pos_score + 0.15 * neg_markers)
    return 0.0


def _intensifier_abuse_score(text: str, neg_score: float) -> float:
    """Excessive intensifiers in a sentence with negative context → likely sarcastic."""
    lower = text.lower()
    intens_count = sum(1 for i in INTENSIFIERS if i in lower)
    if intens_count >= 2 and neg_score >= 1:
        return min(0.5, 0.2 * intens_count)
    return 0.0


def _contradiction_score(text: str) -> float:
    """Praise followed by a contradiction marker signals irony."""
    lower = text.lower()
    pos_hit = any(c in lower for c in POSITIVE_CUES)
    contr_hit = any(c in lower for c in ("but", "however", "yet", "though", "although", "except", "still"))
    neg_hit = any(c in lower for c in NEGATIVE_CUES)
    if pos_hit and contr_hit and neg_hit:
        return 0.55
    if pos_hit and contr_hit:
        return 0.25
    return 0.0


def _pattern_sarcasm_score(text: str) -> tuple[float, list[str]]:
    """Original keyword/emoji pattern detection, returned as float + signals."""
    lower = text.lower()
    signals: list[str] = []
    cue_hits   = sum(1 for c in SARCASM_CUES if c in lower)
    emoji_hits = len(SARCASM_EMOJI.findall(text))
    # Trailing '...' after praise
    ellipsis_after_praise = bool(
        any(c in lower for c in POSITIVE_CUES) and re.search(r"\.{2,}\s*$", text)
    )
    if ellipsis_after_praise:
        cue_hits += 1
        signals.append("trailing-ellipsis-after-praise")
    if cue_hits > 0:
        signals.append(f"sarcasm-cues({cue_hits})")
    if emoji_hits > 0:
        signals.append(f"sarcasm-emoji({emoji_hits})")
    score = min(0.7, cue_hits * 0.20 + emoji_hits * 0.25)
    return score, signals


def compute_sarcasm_score(text: str, pos_score: float, neg_score: float) -> tuple[float, list[str]]:
    """
    Combine all 4 signals into a single sarcasm confidence float (0.0–1.0).
    Returns (score, signals_list).
    """
    pattern_sc, signals = _pattern_sarcasm_score(text)
    tonal_sc    = _tonal_incongruity_score(text, pos_score, neg_score)
    intens_sc   = _intensifier_abuse_score(text, neg_score)
    contradict  = _contradiction_score(text)

    if tonal_sc > 0:
        signals.append(f"tonal-incongruity({tonal_sc:.2f})")
    if intens_sc > 0:
        signals.append(f"intensifier-abuse({intens_sc:.2f})")
    if contradict > 0:
        signals.append(f"contradiction({contradict:.2f})")

    combined = min(1.0, pattern_sc + tonal_sc * 0.5 + intens_sc * 0.4 + contradict * 0.6)
    return combined, signals


def _heuristic_sentiment(text: str) -> tuple[str, float, list[str], float]:
    """Returns (sentiment, confidence, signals, sarcasm_score)."""
    lower   = text.lower()

    # Emoji signals
    pos_emoji_count  = len(POSITIVE_EMOJI.findall(text))
    neg_emoji_count  = len(NEGATIVE_EMOJI.findall(text))

    sarcasm_pattern_raw = len(SARCASM_EMOJI.findall(text))
    neg_score = sum(1 for c in NEGATIVE_CUES  if c in lower) + neg_emoji_count
    pos_score = sum(1 for c in POSITIVE_CUES  if c in lower) + pos_emoji_count

    signals: list[str] = []

    # Caps frustration signal
    caps_words = CAPS_RE.findall(text)
    if caps_words:
        neg_score += 0.5
        signals.append(f"all-caps: {caps_words[:3]}")

    # Multiple question marks
    if QUESTION_RE.search(text):
        neg_score += 0.5
        signals.append("multiple-question-marks")

    # 4-signal sarcasm scorer
    sarcasm_score, sarc_signals = compute_sarcasm_score(text, pos_score, neg_score)
    signals.extend(sarc_signals)

    # Threshold: sarcasm_score >= 0.35 triggers sarcastic label
    if sarcasm_score >= 0.35 and (pos_score > 0 or "!" in text):
        conf = min(0.95, 0.50 + sarcasm_score * 0.45)
        return "sarcastic", conf, signals, sarcasm_score

    if neg_score > pos_score:
        conf = min(0.95, 0.50 + (neg_score - pos_score) * 0.08)
        return "negative", conf, signals, sarcasm_score

    if pos_score > neg_score:
        conf = min(0.95, 0.50 + (pos_score - neg_score) * 0.08)
        return "positive", conf, signals, sarcasm_score

    return "neutral", 0.45, signals, sarcasm_score


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


def _roberta_sentiment(text: str) -> tuple[str, float, float]:
    """Returns (sentiment, confidence, sarcasm_score)."""
    pipe = _load_roberta()
    if pipe is None:
        sent, conf, _, sarc = _heuristic_sentiment(text)
        return sent, conf, sarc
    try:
        result = pipe(text[:512], truncation=True)[0]
        label  = _ROBERTA_LABEL_MAP.get(result["label"].lower(), "neutral")
        score  = float(result["score"])

        # Apply deep sarcasm scorer on top of RoBERTa
        lower     = text.lower()
        pos_score = sum(1 for c in POSITIVE_CUES if c in lower)
        neg_score = sum(1 for c in NEGATIVE_CUES if c in lower)
        sarc_sc, _ = compute_sarcasm_score(text, pos_score, neg_score)

        if sarc_sc >= 0.35 and label in ("positive", "neutral"):
            return "sarcastic", min(0.92, score * 0.7 + sarc_sc * 0.3), sarc_sc

        return label, score, sarc_sc
    except Exception:
        sent, conf, _, sarc = _heuristic_sentiment(text)
        return sent, conf, sarc


# ─────────────────────────────────────────────
# Llama / external inference service
# ─────────────────────────────────────────────

def _llama_sentiment(text: str, url: str) -> tuple[str, float]:
    try:
        with httpx.Client(timeout=30.0) as client:
            resp = client.post(
                url, 
                json={"text": text},
                headers={"ngrok-skip-browser-warning": "true"}
            )
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

def classify_sarcasm_and_sentiment(text: str) -> tuple[str, float, str, list[str], float]:
    """
    Returns (sentiment, confidence, source, sarcasm_signals, sarcasm_score).
    """
    mode = os.getenv("INFERENCE_MODE", "heuristic").lower()

    if mode == "llama":
        url = os.getenv("INFERENCE_URL", "")
        if url:
            sentiment, conf = _llama_sentiment(text, url)
            # Compute sarcasm score even for Llama mode
            lower = text.lower()
            ps = sum(1 for c in POSITIVE_CUES if c in lower)
            ns = sum(1 for c in NEGATIVE_CUES if c in lower)
            sarc_sc, sarc_sigs = compute_sarcasm_score(text, ps, ns)
            return sentiment, conf, "llama_lora", sarc_sigs, sarc_sc

    if mode == "roberta":
        sentiment, conf, sarc_sc = _roberta_sentiment(text)
        return sentiment, conf, "roberta_cpu", [], sarc_sc

    # Default heuristic
    sentiment, conf, signals, sarc_sc = _heuristic_sentiment(text)
    return sentiment, conf, "heuristic_mvp", signals, sarc_sc


def analyze_comment(text: str) -> AnalysisResult:
    cleaned   = normalize_text(text)
    entities  = extract_entities_with_boundary_logic(cleaned)
    sentiment, confidence, source, signals, sarc_score = classify_sarcasm_and_sentiment(cleaned)
    english_ratio, switch_count = detect_language_switching(cleaned)
    regional  = find_regional_tokens(cleaned)

    return AnalysisResult(
        sentiment=sentiment,
        english_ratio=english_ratio,
        language_switch_count=switch_count,
        extracted_entities=entities,
        confidence=confidence,
        source=source,
        sarcasm_score=round(sarc_score, 3),
        sarcasm_signals=signals,
        regional_tokens_found=regional,
    )

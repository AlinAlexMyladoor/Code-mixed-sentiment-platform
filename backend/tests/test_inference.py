"""
Unit tests for the inference engine.
Run: pytest tests/test_inference.py -v
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from inference import (
    analyze_comment,
    detect_language_switching,
    extract_entities_with_boundary_logic,
    normalize_text,
    tokenize_mixed,
    _heuristic_sentiment,
)


# ─── normalize_text ──────────────────────────────────────────────────────────
class TestNormalizeText:
    def test_removes_urls(self):
        result = normalize_text("Check https://example.com for details")
        assert "https" not in result

    def test_removes_mentions(self):
        result = normalize_text("Thanks @brand for the reply!")
        assert "@brand" not in result

    def test_removes_hashtags(self):
        result = normalize_text("Love it #amazing #product")
        assert "#amazing" not in result

    def test_collapses_spaces(self):
        result = normalize_text("too    many    spaces")
        assert "  " not in result


# ─── tokenize_mixed ───────────────────────────────────────────────────────────
class TestTokenizeMixed:
    def test_english_tokens(self):
        tokens = tokenize_mixed("I love this product")
        langs = [lang for _, lang in tokens]
        assert all(l == "english" for l in langs)

    def test_regional_tamil_tokens(self):
        tokens = tokenize_mixed("romba nalla product")
        langs = {lang for _, lang in tokens}
        assert "regional_roman" in langs

    def test_mixed_tokens(self):
        tokens = tokenize_mixed("Product romba bad illa da")
        langs = {lang for _, lang in tokens}
        assert "english" in langs
        assert "regional_roman" in langs


# ─── detect_language_switching ───────────────────────────────────────────────
class TestLanguageSwitching:
    def test_pure_english_ratio(self):
        ratio, switches = detect_language_switching("I love this amazing product")
        assert ratio > 0.8
        assert switches == 0

    def test_mixed_switches(self):
        _, switches = detect_language_switching("Product romba bad experience illa da seri")
        assert switches >= 2

    def test_empty_text(self):
        ratio, switches = detect_language_switching("")
        assert ratio == 0.0
        assert switches == 0


# ─── heuristic_sentiment ─────────────────────────────────────────────────────
class TestHeuristicSentiment:
    def test_positive(self):
        sent, conf, _ = _heuristic_sentiment("I love this amazing product, it is fantastic!")
        assert sent == "positive"
        assert conf > 0.5

    def test_negative(self):
        sent, conf, _ = _heuristic_sentiment("Terrible service, worst experience ever. Hate it.")
        assert sent == "negative"
        assert conf > 0.5

    def test_sarcastic(self):
        sent, conf, _ = _heuristic_sentiment("Wow, what a brilliant idea to increase the price!")
        assert sent == "sarcastic"

    def test_neutral(self):
        sent, conf, _ = _heuristic_sentiment("The package arrived")
        assert sent == "neutral"

    def test_caps_frustration(self):
        sent, conf, signals = _heuristic_sentiment("THIS IS ABSOLUTELY TERRIBLE service")
        # all-caps adds to negative score
        assert sent in ("negative",)

    def test_emoji_positive(self):
        sent, conf, _ = _heuristic_sentiment("Great product 😍❤️👍")
        assert sent == "positive"

    def test_emoji_sarcastic(self):
        sent, conf, _ = _heuristic_sentiment("Great service 🙄 yeah right totally")
        assert sent == "sarcastic"


# ─── extract_entities ────────────────────────────────────────────────────────
class TestEntityExtraction:
    def test_extracts_brands(self):
        result = extract_entities_with_boundary_logic("Samsung Galaxy is amazing, love Apple too")
        assert len(result["brands_mentioned"]) >= 1

    def test_extracts_key_phrases(self):
        result = extract_entities_with_boundary_logic("Terrible service, worst experience ever")
        assert len(result["key_phrases"]) > 0

    def test_extracts_regional_tokens(self):
        result = extract_entities_with_boundary_logic("Product romba nalla irundhuchu, super ah")
        assert len(result["regional_tokens"]) > 0


# ─── analyze_comment (integration) ───────────────────────────────────────────
class TestAnalyzeComment:
    def test_full_pipeline_positive(self):
        result = analyze_comment("I absolutely love this product, fantastic quality!")
        assert result.sentiment == "positive"
        assert 0 <= result.english_ratio <= 1
        assert result.confidence > 0

    def test_full_pipeline_codemixed(self):
        result = analyze_comment("Product romba nalla illa da, worst experience ever")
        assert result.sentiment in ("negative", "neutral", "positive", "sarcastic")
        assert result.language_switch_count >= 0
        assert len(result.regional_tokens_found) > 0

    def test_full_pipeline_sarcastic(self):
        result = analyze_comment("Wow what a brilliant idea to increase the price again!")
        assert result.sentiment == "sarcastic"

    def test_source_is_heuristic_by_default(self):
        result = analyze_comment("Test comment")
        assert result.source == "heuristic_mvp"

    def test_result_has_all_fields(self):
        result = analyze_comment("Some test text romba nalla")
        assert hasattr(result, "sentiment")
        assert hasattr(result, "english_ratio")
        assert hasattr(result, "language_switch_count")
        assert hasattr(result, "extracted_entities")
        assert hasattr(result, "confidence")
        assert hasattr(result, "source")
        assert hasattr(result, "sarcasm_signals")
        assert hasattr(result, "regional_tokens_found")

    def test_handles_empty_string(self):
        result = analyze_comment("")
        assert result.sentiment in ("positive", "negative", "neutral", "sarcastic")

    def test_handles_unicode(self):
        result = analyze_comment("Excellent 🌟 romba super ah iruku 💕")
        assert result.sentiment in ("positive", "sarcastic")

    @pytest.mark.parametrize("text,expected_sentiment", [
        ("I love this amazing product!", "positive"),
        ("Terrible worst service hate it", "negative"),
        ("Wow brilliant idea increase price!", "sarcastic"),
        ("romba nalla super kollam", "positive"),
        ("bahut kharab bekar service", "negative"),
    ])
    def test_parametrized_sentiments(self, text, expected_sentiment):
        result = analyze_comment(text)
        assert result.sentiment == expected_sentiment

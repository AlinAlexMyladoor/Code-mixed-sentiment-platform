import pandas as pd
import random

# Expanded seed phrases for MVP synthetic corpora (English seed → code-mixed Roman output)
english_phrases = [
    {"text": "The food was terrible and the service was slow.", "sentiment": "negative"},
    {"text": "I absolutely love this new product, it is amazing!", "sentiment": "positive"},
    {"text": "Wow, what a brilliant idea to increase the price.", "sentiment": "sarcastic"},
    {"text": "Delivery was fast and packaging nalla irundhuchu.", "sentiment": "positive"},
    {"text": "Never buying again, total waste of money.", "sentiment": "negative"},
    {"text": "Yeah sure, best customer support ever.", "sentiment": "sarcastic"},
    {"text": "Quality is okay but price romba high.", "sentiment": "neutral"},
    {"text": "Thank you team, you made my day!", "sentiment": "positive"},
]

# Romanized regional fragments for offline code-mixing (Tamil/Malayalam/Hindi style)
REGIONAL_FRAGMENTS = [
    "romba nalla",
    "illa da",
    "entha problem",
    "super ah iruku",
    "njan happy",
    "pinne engane",
    "bahut kharab",
    "accha nahi",
    "enna da idhu",
    "kollam",
]


def offline_code_mix(phrase: str) -> str:
    words = phrase.split()
    if len(words) < 3:
        return f"{phrase} {random.choice(REGIONAL_FRAGMENTS)}"
    split_idx = random.randint(1, len(words) - 1)
    return " ".join(words[:split_idx] + [random.choice(REGIONAL_FRAGMENTS)] + words[split_idx:])


def generate_code_mixed_text(phrase: str, use_online: bool = False, target_lang: str = "ml") -> str:
    if not use_online:
        return offline_code_mix(phrase)

    from deep_translator import GoogleTranslator
    from transliterate import translit

    words = phrase.split()
    split_idx = random.randint(1, len(words) - 1) if len(words) > 1 else 1
    english_part = " ".join(words[:split_idx])
    regional_part = " ".join(words[split_idx:])
    try:
        translated = GoogleTranslator(source="auto", target=target_lang).translate(regional_part)
        romanized = translit(translated, "ru", reversed=True)
        return f"{english_part} {romanized}"
    except Exception:
        return offline_code_mix(phrase)


def main():
    use_online = False
    print("Generating synthetic code-mixed dataset (offline mix by default)...")
    rows = []
    for item in english_phrases:
        for _ in range(5):
            mixed = generate_code_mixed_text(item["text"], use_online=use_online)
            rows.append(
                {
                    "original": item["text"],
                    "code_mixed": mixed,
                    "sentiment": item["sentiment"],
                }
            )

    df = pd.DataFrame(rows)
    out = "synthetic_training_data.csv"
    df.to_csv(out, index=False)
    print(f"Saved {len(df)} rows to {out}")


if __name__ == "__main__":
    main()

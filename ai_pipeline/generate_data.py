"""
Expanded synthetic code-mixed dataset generator.
Produces 1000+ rows covering Tamil, Malayalam, Hindi, and Bengali
Romanized code-mixed styles with 4-class labels (positive/negative/neutral/sarcastic).

Usage:
    python generate_data.py              # offline mix (no internet needed)
    python generate_data.py --online     # use Google Translate (requires internet)
"""

import argparse
import random
import csv
import os
from dataclasses import dataclass
from typing import List

# ─── Seed corpus ─────────────────────────────────────────────────────────────
@dataclass
class SeedPhrase:
    text: str
    sentiment: str

SEED_CORPUS: List[SeedPhrase] = [
    # ── Positive ──────────────────────────────────────────────────────────────
    SeedPhrase("The food was absolutely delicious and the service was very fast.", "positive"),
    SeedPhrase("I absolutely love this new product, it is amazing quality!", "positive"),
    SeedPhrase("Delivery was fast and packaging was perfect. Thank you!", "positive"),
    SeedPhrase("Thank you team, you made my day! Best purchase ever.", "positive"),
    SeedPhrase("Outstanding customer support. They resolved my issue instantly.", "positive"),
    SeedPhrase("The quality is premium and totally worth the price.", "positive"),
    SeedPhrase("Received on time and condition was perfect. Highly recommend!", "positive"),
    SeedPhrase("Just tried their new product and it is fantastic, love it!", "positive"),
    SeedPhrase("Super quick delivery, great quality. Will definitely order again.", "positive"),
    SeedPhrase("The app works flawlessly. Beautiful design and very intuitive.", "positive"),
    SeedPhrase("Really happy with my purchase. Exactly as described!", "positive"),
    SeedPhrase("Excellent value for money. Premium quality at affordable price.", "positive"),
    SeedPhrase("Best customer experience I have had in years! Amazing team.", "positive"),
    SeedPhrase("Product exceeded my expectations. Absolutely perfect!", "positive"),

    # ── Negative ──────────────────────────────────────────────────────────────
    SeedPhrase("The food was terrible and the service was incredibly slow.", "negative"),
    SeedPhrase("Never buying again, total waste of money. Worst experience.", "negative"),
    SeedPhrase("Product arrived damaged and customer support is completely useless.", "negative"),
    SeedPhrase("Terrible quality, broke within two days. Completely disappointed.", "negative"),
    SeedPhrase("Waited three weeks and received the wrong item. Refund please!", "negative"),
    SeedPhrase("The app crashes constantly, very buggy and frustrating to use.", "negative"),
    SeedPhrase("Worst delivery experience. Package lost and nobody is helping.", "negative"),
    SeedPhrase("Extremely overpriced for such pathetic quality. Do not buy.", "negative"),
    SeedPhrase("Rude staff and completely unhelpful customer service. Disgusting.", "negative"),
    SeedPhrase("Total scam! Paid for express delivery but it arrived late.", "negative"),
    SeedPhrase("Product is defective right out of the box. Very disappointing.", "negative"),
    SeedPhrase("Missing items in my order and no response from support. Horrible.", "negative"),
    SeedPhrase("Food was cold, stale, and portion sizes are absolutely tiny.", "negative"),
    SeedPhrase("Complete fraud. Product is nothing like the advertisement shows.", "negative"),

    # ── Sarcastic ─────────────────────────────────────────────────────────────
    SeedPhrase("Wow, what a brilliant idea to increase the price by 50 percent!", "sarcastic"),
    SeedPhrase("Yeah sure, best customer support ever. Only waited three hours!", "sarcastic"),
    SeedPhrase("Oh wow, amazing that my order arrived one month late. Great job!", "sarcastic"),
    SeedPhrase("Love how they charge premium prices for such wonderful quality!", "sarcastic"),
    SeedPhrase("Nice one! Delivered the wrong product and now ignoring my calls.", "sarcastic"),
    SeedPhrase("Totally worth waiting two months for this absolutely brilliant product.", "sarcastic"),
    SeedPhrase("How wonderful that their helpline goes straight to voicemail always!", "sarcastic"),
    SeedPhrase("As if the price hike was not enough, now they reduced quality too!", "sarcastic"),
    SeedPhrase("Oh really, so helpful of them to respond after one whole week!", "sarcastic"),
    SeedPhrase("Incredible service! Cancelled my order without any notice whatsoever.", "sarcastic"),
    SeedPhrase("So great that their premium product broke on the very first use!", "sarcastic"),
    SeedPhrase("Mind blowing that they call this five star service honestly.", "sarcastic"),

    # ── Neutral ───────────────────────────────────────────────────────────────
    SeedPhrase("Quality is okay but the price is a bit high for what you get.", "neutral"),
    SeedPhrase("Product looks decent. Nothing extraordinary but does the job.", "neutral"),
    SeedPhrase("Average experience. Some things good, some things could be better.", "neutral"),
    SeedPhrase("Delivery was on time. The product is alright, nothing special.", "neutral"),
    SeedPhrase("It is fine for the price. Not the best but acceptable quality.", "neutral"),
    SeedPhrase("Normal experience. Customer service was okay. Will see how it goes.", "neutral"),
    SeedPhrase("The app is functional. Basic features work. Nothing impressive.", "neutral"),
    SeedPhrase("Order arrived. Product is as described. Average quality overall.", "neutral"),
]

# ─── Regional fragment banks ─────────────────────────────────────────────────
TAMIL_POSITIVE = [
    "romba nalla", "super ah iruku", "nalla irundhuchu", "sema product",
    "ipdi irukanum", "kollam", "mela trust", "anbudan", "epadi irundhalum nalla",
]
TAMIL_NEGATIVE = [
    "romba mosam", "illa da seri", "ketta service", "enna da idhu",
    "waste panra", "paavam", "theriyama panrom", "bayangara problem",
]
TAMIL_NEUTRAL = [
    "sari tha", "paakalam", "seri da", "idhu epadi iruku theriyala", "normal ah iruku",
]

MALAYALAM_POSITIVE = [
    "njan happy aanu", "kollam aayirunnu", "adipoli aayirunnu", "super aayirunnu",
    "valare nalla aanu", "enthayalum nalla", "ente mone super", "superb aayirunnu",
]
MALAYALAM_NEGATIVE = [
    "mosham aanu", "moshamayi", "prashnam undu", "nallatalla", "cheriya quality",
    "avarude seva moshamaanu", "ningal cheythath shari alla",
]
MALAYALAM_NEUTRAL = [
    "sari aanu", "ithu epadi aanu theriyilla", "avanumithu poyallo", "okay aanu",
]

HINDI_POSITIVE = [
    "bahut accha hai", "mast hai", "zabardast quality", "bilkul sahi hai",
    "wah wah amazing", "shandar service", "lajawaab product", "bahut badhiya",
]
HINDI_NEGATIVE = [
    "bahut kharab", "bekar service", "bakwaas product", "dhoka diya",
    "nahi chalega", "bahut bura experience", "ganda quality", "bekaar hai",
]
HINDI_NEUTRAL = [
    "theek hai", "thik thak hai", "dekhte hai", "chalega", "kuch khas nahi",
]

BENGALI_POSITIVE = [
    "khub bhalo", "darun product", "oshadharon service", "onek valo",
    "ekdom perfect", "sundor packaging", "khub satisfied", "bhalo laglo",
]
BENGALI_NEGATIVE = [
    "khub kharap", "baje quality", "nosto product", "byartho experience",
    "khub dukkhojonok", "emon service hole cholena", "amader theke ekhane",
]
BENGALI_NEUTRAL = [
    "thik ache", "mota muti bhalo", "ektu valo ektu kharap", "okay ache",
]

SENTIMENT_FRAGMENTS = {
    "positive": TAMIL_POSITIVE + MALAYALAM_POSITIVE + HINDI_POSITIVE + BENGALI_POSITIVE,
    "negative": TAMIL_NEGATIVE + MALAYALAM_NEGATIVE + HINDI_NEGATIVE + BENGALI_NEGATIVE,
    "neutral":  TAMIL_NEUTRAL  + MALAYALAM_NEUTRAL  + HINDI_NEUTRAL  + BENGALI_NEUTRAL,
    "sarcastic": TAMIL_NEGATIVE + MALAYALAM_NEGATIVE + HINDI_NEGATIVE,  # sarcasm uses negative regional tone
}

MIX_STYLES = ["prefix", "suffix", "middle", "interleaved"]


def offline_code_mix(phrase: str, sentiment: str) -> str:
    """Inject regional Romanized fragments into English phrase."""
    fragments = SENTIMENT_FRAGMENTS.get(sentiment, TAMIL_NEUTRAL)
    frag = random.choice(fragments)
    words = phrase.split()
    style = random.choice(MIX_STYLES)

    if style == "prefix":
        return f"{frag}, {phrase.lower()}"
    elif style == "suffix":
        return f"{phrase} {frag}"
    elif style == "middle" and len(words) > 3:
        mid = len(words) // 2
        return " ".join(words[:mid]) + f" {frag} " + " ".join(words[mid:])
    else:  # interleaved - replace a word
        if len(words) > 4:
            idx = random.randint(1, len(words) - 2)
            words[idx] = frag
            return " ".join(words)
        return f"{phrase} {frag}"


def generate_online(phrase: str, target_lang: str = "ta") -> str:
    """Online mode: translate partial phrase and transliterate to Roman."""
    try:
        from deep_translator import GoogleTranslator
        words = phrase.split()
        if len(words) < 2:
            return phrase
        split_idx = random.randint(1, len(words) - 1)
        english_part  = " ".join(words[:split_idx])
        regional_part = " ".join(words[split_idx:])
        translated    = GoogleTranslator(source="auto", target=target_lang).translate(regional_part)
        # Simple ASCII transliteration fallback
        return f"{english_part} {translated}"
    except Exception:
        return phrase


def generate_variations(seed: SeedPhrase, n_per_seed: int = 10, use_online: bool = False) -> list[dict]:
    rows = []
    langs = ["ta", "ml", "hi", "bn"]

    for i in range(n_per_seed):
        if use_online and i % 3 == 0:
            lang  = random.choice(langs)
            mixed = generate_online(seed.text, target_lang=lang)
        else:
            mixed = offline_code_mix(seed.text, seed.sentiment)

        # Vary mixing ratio
        mix_ratio = round(random.uniform(0.3, 0.9), 2)
        rows.append({
            "original":    seed.text,
            "code_mixed":  mixed,
            "sentiment":   seed.sentiment,
            "mix_ratio":   mix_ratio,
            "base_lang":   random.choice(["tamil", "malayalam", "hindi", "bengali"]),
        })
    return rows


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--online",  action="store_true", help="Use Google Translate")
    parser.add_argument("--n",       type=int, default=15, help="Variations per seed phrase")
    parser.add_argument("--out",     default="synthetic_training_data.csv", help="Output CSV path")
    parser.add_argument("--val-split", type=float, default=0.2, help="Validation split ratio")
    args = parser.parse_args()

    print(f"Generating synthetic dataset ({len(SEED_CORPUS)} seeds × {args.n} = ~{len(SEED_CORPUS)*args.n} rows)...")

    all_rows = []
    for seed in SEED_CORPUS:
        all_rows.extend(generate_variations(seed, n_per_seed=args.n, use_online=args.online))

    random.shuffle(all_rows)

    val_n    = int(len(all_rows) * args.val_split)
    train    = all_rows[val_n:]
    val      = all_rows[:val_n]

    out_dir = os.path.dirname(args.out) or "."
    base    = os.path.splitext(os.path.basename(args.out))[0]

    train_path = os.path.join(out_dir, f"{base}.csv")
    val_path   = os.path.join(out_dir, f"{base}_val.csv")

    def write_csv(rows, path):
        with open(path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=["original", "code_mixed", "sentiment", "mix_ratio", "base_lang"])
            writer.writeheader()
            writer.writerows(rows)

    write_csv(train, train_path)
    write_csv(val,   val_path)

    # Stats
    from collections import Counter
    counts = Counter(r["sentiment"] for r in all_rows)
    print(f"\n✅ Generated {len(train)} training + {len(val)} validation rows")
    print(f"📊 Sentiment distribution:")
    for label, count in sorted(counts.items()):
        print(f"   {label:12s}: {count:4d} ({count/len(all_rows)*100:.1f}%)")
    print(f"\n📁 Train: {train_path}")
    print(f"📁 Val:   {val_path}")


if __name__ == "__main__":
    main()

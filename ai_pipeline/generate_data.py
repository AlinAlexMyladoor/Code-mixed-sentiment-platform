import pandas as pd
import random
from deep_translator import GoogleTranslator
from transliterate import translit

# Sample base phrases (In a real scenario, you would load thousands of these from a CSV)
english_phrases = [
    {"text": "The food was terrible and the service was slow.", "sentiment": "negative"},
    {"text": "I absolutely love this new product, it is amazing!", "sentiment": "positive"},
    {"text": "Wow, what a brilliant idea to increase the price.", "sentiment": "sarcastic"}
]

def generate_code_mixed_text(phrase, target_lang='ml'):
    """
    Simulates code-mixing by translating half the sentence into a regional language 
    (e.g., Malayalam - 'ml') and transliterating it into Roman script.
    """
    words = phrase.split()
    # Randomly select a split point to switch languages
    split_idx = random.randint(1, len(words) - 1) if len(words) > 1 else 1
    
    english_part = " ".join(words[:split_idx])
    regional_part = " ".join(words[split_idx:])
    
    try:
        # Translate the second half using deep-translator
        translated = GoogleTranslator(source='auto', target=target_lang).translate(regional_part)
        
        # Transliterate the regional script back to Roman characters
        romanized_regional = translit(translated, 'ru', reversed=True) # using 'ru' as a placeholder fallback
        
        return f"{english_part} {romanized_regional}"
    except Exception as e:
        print(f"Translation failed for chunk: {regional_part} - Error: {e}")
        return phrase

print("Generating synthetic code-mixed dataset...")
synthetic_data = []

for item in english_phrases:
    mixed_text = generate_code_mixed_text(item["text"])
    synthetic_data.append({
        "original": item["text"],
        "code_mixed": mixed_text,
        "sentiment": item["sentiment"]
    })

# Save to a dataset file for the fine-tuning script
df = pd.DataFrame(synthetic_data)
df.to_csv("synthetic_training_data.csv", index=False)
print("Dataset generated and saved to synthetic_training_data.csv")
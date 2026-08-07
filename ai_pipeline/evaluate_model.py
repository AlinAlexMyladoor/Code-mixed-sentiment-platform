import argparse
import pandas as pd
from sklearn.metrics import precision_recall_fscore_support, accuracy_score, classification_report
import requests

parser = argparse.ArgumentParser(description="Evaluate AI Model (LoRA/RoBERTa) on a dataset")
parser.add_argument("--data", default="synthetic_training_data_val.csv", help="Validation CSV path")
parser.add_argument("--url", default="http://localhost:8001/analyze", help="Inference server URL")
args = parser.parse_args()

def main():
    print(f"Loading data from {args.data}...")
    try:
        df = pd.read_csv(args.data)
    except FileNotFoundError:
        print(f"Dataset {args.data} not found. Please ensure validation data exists.")
        return

    if 'text' not in df.columns or 'sentiment' not in df.columns:
        if 'code_mixed' in df.columns:
            df['text'] = df['code_mixed']
        else:
            print("Dataset must have 'text' and 'sentiment' columns.")
            return

    y_true = []
    y_pred = []

    print(f"Evaluating {len(df)} samples against {args.url}...")
    
    for idx, row in df.iterrows():
        text = str(row['text'])
        true_label = str(row['sentiment']).lower()
        
        try:
            resp = requests.post(args.url, json={"text": text})
            if resp.status_code == 200:
                pred_label = resp.json().get("sentiment", "neutral").lower()
            else:
                pred_label = "neutral"
        except Exception:
            pred_label = "neutral"
            
        y_true.append(true_label)
        y_pred.append(pred_label)
        
        if (idx + 1) % 50 == 0:
            print(f"Processed {idx + 1}/{len(df)}")

    # Calculate metrics
    precision, recall, f1, _ = precision_recall_fscore_support(y_true, y_pred, average='weighted', zero_division=0)
    acc = accuracy_score(y_true, y_pred)

    print("\n" + "="*50)
    print("📈 Evaluation Results")
    print("="*50)
    print(f"Accuracy:  {acc:.4f}")
    print(f"Precision: {precision:.4f}")
    print(f"Recall:    {recall:.4f}")
    print(f"F1 Score:  {f1:.4f}")
    print("\nDetailed Classification Report:")
    print(classification_report(y_true, y_pred, zero_division=0))
    print("="*50)

if __name__ == "__main__":
    main()

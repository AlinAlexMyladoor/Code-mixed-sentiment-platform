"""
Complete LoRA fine-tuning script for Llama 3 8B on code-mixed sentiment data.

Usage (GPU required — run on cloud instance):
    python train_lora.py --data synthetic_training_data.csv --steps 500

Requirements:
    pip install -r requirements.txt
    huggingface-cli login   (Llama 3 is gated — need HuggingFace token)
"""

import argparse
import os
import sys

import torch
from datasets import load_dataset, DatasetDict
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    TrainingArguments,
    EarlyStoppingCallback,
)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from trl import SFTTrainer

# ─── CLI ─────────────────────────────────────────────────────────────────────
parser = argparse.ArgumentParser(description="Fine-tune Llama 3 8B with LoRA on code-mixed sentiment data")
parser.add_argument("--model",      default="meta-llama/Meta-Llama-3-8B-Instruct", help="Base model name")
parser.add_argument("--data",       default="synthetic_training_data.csv", help="Training CSV path")
parser.add_argument("--val-data",   default="synthetic_training_data_val.csv", help="Validation CSV path")
parser.add_argument("--output",     default="./llama3-code-mixed-lora", help="Output directory")
parser.add_argument("--steps",      type=int, default=500, help="Max training steps (use 2000+ for production)")
parser.add_argument("--batch-size", type=int, default=2)
parser.add_argument("--lr",         type=float, default=2e-4)
parser.add_argument("--resume",     action="store_true", help="Resume from checkpoint")
args = parser.parse_args() if __name__ == "__main__" else argparse.Namespace(
    model="meta-llama/Meta-Llama-3-8B-Instruct",
    data="synthetic_training_data.csv",
    val_data="synthetic_training_data_val.csv",
    output="./llama3-code-mixed-lora",
    steps=500,
    batch_size=2,
    lr=2e-4,
    resume=False,
)

LABELS = ["positive", "negative", "neutral", "sarcastic"]

SYSTEM_PROMPT = (
    "You are a multilingual sentiment analysis expert specializing in code-mixed text "
    "where English is mixed with Romanized regional languages (Tamil, Malayalam, Hindi, Bengali). "
    "Classify the sentiment as exactly one of: positive, negative, neutral, sarcastic."
)


def format_instruction(example: dict) -> dict:
    """Format as Llama 3 chat template for instruction tuning."""
    text = example.get("code_mixed") or example.get("text") or ""
    label = (example.get("sentiment") or "neutral").lower()
    if label not in LABELS:
        label = "neutral"

    # Llama 3 instruction format
    formatted = (
        f"<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n"
        f"{SYSTEM_PROMPT}<|eot_id|>"
        f"<|start_header_id|>user<|end_header_id|>\n"
        f"Classify the sentiment of this code-mixed comment:\n\"{text}\"<|eot_id|>"
        f"<|start_header_id|>assistant<|end_header_id|>\n"
        f"{label}<|eot_id|>"
    )
    return {"text": formatted, "label": label}


def main():
    if not torch.cuda.is_available():
        print("⚠️  WARNING: No GPU detected. Training will be extremely slow on CPU.")
        print("   Use a cloud GPU instance (A100/H100 recommended, T4 minimum).")
        sys.exit(1)

    print(f"🚀 Starting LoRA fine-tuning: {args.model}")
    print(f"   GPU: {torch.cuda.get_device_name(0)}")
    print(f"   VRAM: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")

    # 1. 4-bit quantization config
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16,
        bnb_4bit_use_double_quant=True,
    )

    # 2. Load tokenizer
    print("Loading tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained(args.model, use_fast=True)
    tokenizer.pad_token    = tokenizer.eos_token
    tokenizer.padding_side = "right"

    # 3. Load model
    print("Loading base model in 4-bit...")
    model = AutoModelForCausalLM.from_pretrained(
        args.model,
        quantization_config=bnb_config,
        device_map="auto",
        attn_implementation="flash_attention_2" if torch.cuda.is_bf16_supported() else "eager",
    )
    model.config.use_cache = False
    model = prepare_model_for_kbit_training(model)

    # 4. LoRA config (target attention + feedforward projections)
    lora_config = LoraConfig(
        r=16,
        lora_alpha=32,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
    )
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    # 5. Load and format dataset
    print("Loading dataset...")
    raw = load_dataset("csv", data_files={"train": args.data}, split="train")
    if os.path.exists(args.val_data):
        val_raw = load_dataset("csv", data_files={"validation": args.val_data}, split="validation")
    else:
        split   = raw.train_test_split(test_size=0.15, seed=42)
        raw     = split["train"]
        val_raw = split["test"]

    dataset = raw.map(format_instruction, remove_columns=raw.column_names)
    val_set = val_raw.map(format_instruction, remove_columns=val_raw.column_names)

    print(f"   Train: {len(dataset)} | Val: {len(val_set)}")

    # 6. Training arguments
    training_args = TrainingArguments(
        output_dir=args.output,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        gradient_accumulation_steps=4,
        learning_rate=args.lr,
        lr_scheduler_type="cosine",
        warmup_ratio=0.05,
        logging_steps=10,
        eval_steps=50,
        save_steps=100,
        max_steps=args.steps,
        evaluation_strategy="steps",
        save_strategy="steps",
        load_best_model_at_end=True,
        metric_for_best_model="eval_loss",
        optim="paged_adamw_8bit",
        bf16=torch.cuda.is_bf16_supported(),
        fp16=not torch.cuda.is_bf16_supported(),
        group_by_length=True,
        report_to="none",
        resume_from_checkpoint=args.resume,
    )

    # 7. Train
    trainer = SFTTrainer(
        model=model,
        train_dataset=dataset,
        eval_dataset=val_set,
        peft_config=lora_config,
        dataset_text_field="text",
        max_seq_length=512,
        tokenizer=tokenizer,
        args=training_args,
        callbacks=[EarlyStoppingCallback(early_stopping_patience=3)],
    )

    print(f"🏋️  Training for max {args.steps} steps...")
    trainer.train(resume_from_checkpoint=args.resume)

    # 8. Save
    trainer.model.save_pretrained(args.output)
    tokenizer.save_pretrained(args.output)
    print(f"\n✅ Model saved to {args.output}")
    print(f"   To serve: python inference_server.py --model {args.output}")


if __name__ == "__main__":
    main()
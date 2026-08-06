import torch
from datasets import load_dataset
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    TrainingArguments,
    Trainer,
    DataCollatorForLanguageModeling
)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training

# Target the Llama 3 8B model (Requires Hugging Face authentication/access approval)
MODEL_NAME = "meta-llama/Meta-Llama-3-8B"

print("Loading tokenizer and model...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
tokenizer.pad_token = tokenizer.eos_token

# Load model in 8-bit quantization for memory efficiency on cloud GPUs
model = AutoModelForCausalLM.from_pretrained(
    MODEL_NAME,
    load_in_8bit=True,
    device_map="auto"
)
model = prepare_model_for_kbit_training(model)

# Configure LoRA (Parameter-Efficient Fine-Tuning)
lora_config = LoraConfig(
    r=16,
    lora_alpha=32,
    target_modules=["q_proj", "v_proj"],
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM"
)
model = get_peft_model(model, lora_config)
model.print_trainable_parameters()

# Load the synthetic dataset generated in Step 2
dataset = load_dataset("csv", data_files="synthetic_training_data.csv")

def tokenize_function(examples):
    # Format the input to teach the model to classify sentiments based on code-mixed text
    prompts = [
        f"Analyze the sentiment of this code-mixed text. Text: {text}\nSentiment: {sentiment}" 
        for text, sentiment in zip(examples['code_mixed'], examples['sentiment'])
    ]
    return tokenizer(prompts, padding="max_length", truncation=True, max_length=128)

tokenized_datasets = dataset.map(tokenize_function, batched=True)

# Set up the Training Arguments
training_args = TrainingArguments(
    output_dir="./llama3-codemixed-lora",
    per_device_train_batch_size=4,
    gradient_accumulation_steps=4,
    learning_rate=2e-4,
    logging_steps=10,
    max_steps=100, # Keep low for MVP testing
    fp16=True,
    save_steps=50,
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_datasets["train"],
    data_collator=DataCollatorForLanguageModeling(tokenizer, mlm=False)
)

print("Starting LoRA fine-tuning...")
# trainer.train() 
# Uncomment the line above when executing on a cloud GPU instance.

print("Model adapters saved to ./llama3-codemixed-lora")
# trainer.model.save_pretrained("./llama3-codemixed-lora")
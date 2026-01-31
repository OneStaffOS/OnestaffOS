"""
Training Pipeline for IT Help Desk Chatbot

Features:
- Mixed precision training (optional)
- Learning rate scheduling with warmup
- Early stopping
- Model checkpointing
- Training metrics logging
"""

import json
import os
import time
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import random
import numpy as np

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader

from config import (
    MODEL_CONFIG, DATA_CONFIG, TRAINING_CONFIG,
    MODEL_DIR, LOG_DIR
)
from model import IntentClassifier, create_model
from tokenizer import SimpleTokenizer, build_tokenizer_from_data


def set_seed(seed: int = 42):
    """Set random seeds for reproducibility"""
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


class IntentDataset(Dataset):
    """PyTorch Dataset for intent classification"""
    
    def __init__(self, 
                 data: List[Dict],
                 tokenizer: SimpleTokenizer,
                 max_length: int = MODEL_CONFIG.max_seq_length):
        self.data = data
        self.tokenizer = tokenizer
        self.max_length = max_length
    
    def __len__(self) -> int:
        return len(self.data)
    
    def __getitem__(self, idx: int) -> Dict[str, torch.Tensor]:
        sample = self.data[idx]
        
        # Tokenize
        encoded = self.tokenizer.encode(
            sample['text'],
            max_length=self.max_length,
            padding=True,
            truncation=True
        )
        
        return {
            'input_ids': torch.tensor(encoded['input_ids'], dtype=torch.long),
            'attention_mask': torch.tensor(encoded['attention_mask'], dtype=torch.long),
            'labels': torch.tensor(sample['intent_idx'], dtype=torch.long),
        }


class LabelSmoothingLoss(nn.Module):
    """Cross-entropy loss with label smoothing"""
    
    def __init__(self, num_classes: int, smoothing: float = 0.1):
        super().__init__()
        self.num_classes = num_classes
        self.smoothing = smoothing
        self.confidence = 1.0 - smoothing
    
    def forward(self, pred: torch.Tensor, target: torch.Tensor) -> torch.Tensor:
        """
        Args:
            pred: (batch_size, num_classes) logits
            target: (batch_size,) class indices
        """
        pred = pred.log_softmax(dim=-1)
        
        with torch.no_grad():
            true_dist = torch.zeros_like(pred)
            true_dist.fill_(self.smoothing / (self.num_classes - 1))
            true_dist.scatter_(1, target.unsqueeze(1), self.confidence)
        
        return torch.mean(torch.sum(-true_dist * pred, dim=-1))


class CosineWarmupScheduler:
    """Learning rate scheduler with linear warmup and cosine decay"""
    
    def __init__(self, 
                 optimizer: optim.Optimizer,
                 warmup_steps: int,
                 total_steps: int,
                 min_lr: float = 1e-7):
        self.optimizer = optimizer
        self.warmup_steps = warmup_steps
        self.total_steps = total_steps
        self.min_lr = min_lr
        self.base_lrs = [group['lr'] for group in optimizer.param_groups]
        self.current_step = 0
    
    def step(self):
        self.current_step += 1
        lr = self.get_lr()
        for param_group in self.optimizer.param_groups:
            param_group['lr'] = lr
    
    def get_lr(self) -> float:
        if self.current_step < self.warmup_steps:
            # Linear warmup
            return self.base_lrs[0] * self.current_step / self.warmup_steps
        else:
            # Cosine decay
            progress = (self.current_step - self.warmup_steps) / (self.total_steps - self.warmup_steps)
            return self.min_lr + (self.base_lrs[0] - self.min_lr) * 0.5 * (1 + np.cos(np.pi * progress))


class EarlyStopping:
    """Early stopping to prevent overfitting"""
    
    def __init__(self, patience: int = 5, min_delta: float = 0.001, mode: str = 'min'):
        self.patience = patience
        self.min_delta = min_delta
        self.mode = mode
        self.counter = 0
        self.best_score = None
        self.early_stop = False
    
    def __call__(self, score: float) -> bool:
        if self.best_score is None:
            self.best_score = score
            return False
        
        if self.mode == 'min':
            improved = score < self.best_score - self.min_delta
        else:
            improved = score > self.best_score + self.min_delta
        
        if improved:
            self.best_score = score
            self.counter = 0
        else:
            self.counter += 1
            if self.counter >= self.patience:
                self.early_stop = True
        
        return self.early_stop


class Trainer:
    """Main training class"""
    
    def __init__(self,
                 model: IntentClassifier,
                 tokenizer: SimpleTokenizer,
                 train_data: List[Dict],
                 valid_data: List[Dict],
                 device: str = None):
        
        self.model = model
        self.tokenizer = tokenizer
        self.device = device or ('cuda' if torch.cuda.is_available() else 'cpu')
        self.model.to(self.device)
        
        # Create datasets
        self.train_dataset = IntentDataset(train_data, tokenizer)
        self.valid_dataset = IntentDataset(valid_data, tokenizer)
        
        # Create dataloaders
        self.train_loader = DataLoader(
            self.train_dataset,
            batch_size=TRAINING_CONFIG.batch_size,
            shuffle=True,
            num_workers=0,
            pin_memory=True if self.device == 'cuda' else False
        )
        
        self.valid_loader = DataLoader(
            self.valid_dataset,
            batch_size=TRAINING_CONFIG.batch_size * 2,
            shuffle=False,
            num_workers=0
        )
        
        # Loss function
        self.criterion = LabelSmoothingLoss(
            num_classes=model.num_intents,
            smoothing=TRAINING_CONFIG.label_smoothing
        )
        
        # Optimizer
        self.optimizer = optim.AdamW(
            model.parameters(),
            lr=TRAINING_CONFIG.learning_rate,
            weight_decay=TRAINING_CONFIG.weight_decay,
            betas=(TRAINING_CONFIG.beta1, TRAINING_CONFIG.beta2),
            eps=TRAINING_CONFIG.epsilon
        )
        
        # Scheduler
        total_steps = len(self.train_loader) * TRAINING_CONFIG.num_epochs
        warmup_steps = int(total_steps * TRAINING_CONFIG.warmup_ratio)
        self.scheduler = CosineWarmupScheduler(
            self.optimizer,
            warmup_steps=warmup_steps,
            total_steps=total_steps
        )
        
        # Early stopping
        self.early_stopping = EarlyStopping(
            patience=TRAINING_CONFIG.patience,
            min_delta=TRAINING_CONFIG.min_delta,
            mode='max'  # Monitoring accuracy
        )
        
        # Training state
        self.best_accuracy = 0.0
        self.training_history = []
        
        print(f"Training on device: {self.device}")
        print(f"Train samples: {len(train_data)}, Valid samples: {len(valid_data)}")
        print(f"Batch size: {TRAINING_CONFIG.batch_size}")
        print(f"Total steps: {total_steps}, Warmup steps: {warmup_steps}")
    
    def train_epoch(self, epoch: int) -> Dict[str, float]:
        """Train for one epoch"""
        self.model.train()
        
        total_loss = 0.0
        correct = 0
        total = 0
        
        for batch_idx, batch in enumerate(self.train_loader):
            # Move to device
            input_ids = batch['input_ids'].to(self.device)
            attention_mask = batch['attention_mask'].to(self.device)
            labels = batch['labels'].to(self.device)
            
            # Forward pass
            self.optimizer.zero_grad()
            output = self.model(input_ids, attention_mask)
            logits = output['logits']
            
            # Loss
            loss = self.criterion(logits, labels)
            
            # Backward pass
            loss.backward()
            
            # Gradient clipping
            torch.nn.utils.clip_grad_norm_(
                self.model.parameters(),
                TRAINING_CONFIG.gradient_clip
            )
            
            # Update weights
            self.optimizer.step()
            self.scheduler.step()
            
            # Metrics
            total_loss += loss.item()
            predictions = logits.argmax(dim=-1)
            correct += (predictions == labels).sum().item()
            total += labels.size(0)
            
            # Log progress
            if (batch_idx + 1) % TRAINING_CONFIG.log_every_n_steps == 0:
                current_lr = self.scheduler.get_lr()
                print(f"  Batch {batch_idx + 1}/{len(self.train_loader)} | "
                      f"Loss: {loss.item():.4f} | LR: {current_lr:.2e}")
        
        return {
            'loss': total_loss / len(self.train_loader),
            'accuracy': correct / total,
        }
    
    @torch.no_grad()
    def evaluate(self) -> Dict[str, float]:
        """Evaluate on validation set"""
        self.model.eval()
        
        total_loss = 0.0
        correct = 0
        total = 0
        top3_correct = 0
        
        all_predictions = []
        all_labels = []
        
        for batch in self.valid_loader:
            input_ids = batch['input_ids'].to(self.device)
            attention_mask = batch['attention_mask'].to(self.device)
            labels = batch['labels'].to(self.device)
            
            output = self.model(input_ids, attention_mask)
            logits = output['logits']
            
            loss = self.criterion(logits, labels)
            total_loss += loss.item()
            
            # Top-1 accuracy
            predictions = logits.argmax(dim=-1)
            correct += (predictions == labels).sum().item()
            
            # Top-3 accuracy
            top3_preds = logits.topk(3, dim=-1).indices
            for i, label in enumerate(labels):
                if label in top3_preds[i]:
                    top3_correct += 1
            
            total += labels.size(0)
            
            all_predictions.extend(predictions.cpu().tolist())
            all_labels.extend(labels.cpu().tolist())
        
        return {
            'loss': total_loss / len(self.valid_loader),
            'accuracy': correct / total,
            'top3_accuracy': top3_correct / total,
            'predictions': all_predictions,
            'labels': all_labels,
        }
    
    def train(self, num_epochs: int = TRAINING_CONFIG.num_epochs) -> Dict:
        """Full training loop"""
        print("\n" + "=" * 60)
        print("Starting Training")
        print("=" * 60)
        
        start_time = time.time()
        
        for epoch in range(1, num_epochs + 1):
            epoch_start = time.time()
            
            print(f"\nEpoch {epoch}/{num_epochs}")
            print("-" * 40)
            
            # Train
            train_metrics = self.train_epoch(epoch)
            
            # Evaluate
            valid_metrics = self.evaluate()
            
            epoch_time = time.time() - epoch_start
            
            # Log metrics
            print(f"Train Loss: {train_metrics['loss']:.4f} | "
                  f"Train Acc: {train_metrics['accuracy']:.4f}")
            print(f"Valid Loss: {valid_metrics['loss']:.4f} | "
                  f"Valid Acc: {valid_metrics['accuracy']:.4f} | "
                  f"Top-3 Acc: {valid_metrics['top3_accuracy']:.4f}")
            print(f"Epoch Time: {epoch_time:.1f}s")
            
            # Save history
            self.training_history.append({
                'epoch': epoch,
                'train_loss': train_metrics['loss'],
                'train_accuracy': train_metrics['accuracy'],
                'valid_loss': valid_metrics['loss'],
                'valid_accuracy': valid_metrics['accuracy'],
                'top3_accuracy': valid_metrics['top3_accuracy'],
                'learning_rate': self.scheduler.get_lr(),
            })
            
            # Save best model
            if valid_metrics['accuracy'] > self.best_accuracy:
                self.best_accuracy = valid_metrics['accuracy']
                self.save_checkpoint('best_model.pt')
                print(f"✅ New best model saved! Accuracy: {self.best_accuracy:.4f}")
            
            # Early stopping
            if self.early_stopping(valid_metrics['accuracy']):
                print(f"\n⚠️ Early stopping triggered at epoch {epoch}")
                break
            
            # Periodic checkpoint
            if epoch % TRAINING_CONFIG.save_every_n_epochs == 0:
                self.save_checkpoint(f'checkpoint_epoch_{epoch}.pt')
        
        total_time = time.time() - start_time
        
        print("\n" + "=" * 60)
        print("Training Complete!")
        print("=" * 60)
        print(f"Total Time: {total_time / 60:.1f} minutes")
        print(f"Best Validation Accuracy: {self.best_accuracy:.4f}")
        
        # Save final model and training history
        self.save_checkpoint('final_model.pt')
        self.save_training_history()
        
        return {
            'best_accuracy': self.best_accuracy,
            'total_time': total_time,
            'history': self.training_history,
        }
    
    def save_checkpoint(self, filename: str):
        """Save model checkpoint"""
        filepath = os.path.join(MODEL_DIR, filename)
        
        checkpoint = {
            'model_state_dict': self.model.state_dict(),
            'optimizer_state_dict': self.optimizer.state_dict(),
            'best_accuracy': self.best_accuracy,
            'model_config': {
                'vocab_size': self.model.vocab_size,
                'embedding_dim': self.model.embedding_dim,
                'num_intents': self.model.num_intents,
                'num_layers': MODEL_CONFIG.num_layers,
                'num_heads': MODEL_CONFIG.num_heads,
                'hidden_dim': MODEL_CONFIG.hidden_dim,
                'max_seq_length': MODEL_CONFIG.max_seq_length,
                'dropout': MODEL_CONFIG.dropout,
            }
        }
        
        torch.save(checkpoint, filepath)
    
    def save_training_history(self):
        """Save training history to JSON"""
        filepath = os.path.join(LOG_DIR, 'training_history.json')
        
        with open(filepath, 'w') as f:
            json.dump(self.training_history, f, indent=2)
        
        print(f"✅ Training history saved to {filepath}")


def load_data() -> Tuple[List[Dict], List[Dict], Dict]:
    """Load processed data"""
    with open(DATA_CONFIG.train_path, 'r') as f:
        train_data = json.load(f)
    
    with open(DATA_CONFIG.valid_path, 'r') as f:
        valid_data = json.load(f)
    
    with open(DATA_CONFIG.intent_map_path, 'r') as f:
        intent_map = json.load(f)
    
    return train_data, valid_data, intent_map


def main():
    """Main training script"""
    print("=" * 60)
    print("IT Help Desk Chatbot - Training Pipeline")
    print("=" * 60)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Set seed
    set_seed(42)
    
    # Check for preprocessed data
    if not os.path.exists(DATA_CONFIG.train_path):
        print("\n⚠️ Preprocessed data not found. Running preprocessing...")
        from preprocess import DataProcessor
        processor = DataProcessor()
        processor.process()
    
    # Load data
    print("\n[1/4] Loading data...")
    train_data, valid_data, intent_map = load_data()
    num_intents = intent_map['num_intents']
    print(f"  Train: {len(train_data)}, Valid: {len(valid_data)}, Intents: {num_intents}")
    
    # Build/load tokenizer
    print("\n[2/4] Building tokenizer...")
    if os.path.exists(MODEL_CONFIG.tokenizer_path):
        tokenizer = SimpleTokenizer.load(MODEL_CONFIG.tokenizer_path)
    else:
        tokenizer = build_tokenizer_from_data()
    print(f"  Vocabulary size: {len(tokenizer)}")
    
    # Create model
    print("\n[3/4] Creating model...")
    model = create_model(num_intents=num_intents, vocab_size=len(tokenizer))
    
    # Train
    print("\n[4/4] Starting training...")
    trainer = Trainer(
        model=model,
        tokenizer=tokenizer,
        train_data=train_data,
        valid_data=valid_data
    )
    
    results = trainer.train(num_epochs=TRAINING_CONFIG.num_epochs)
    
    print("\n" + "=" * 60)
    print("✅ Training Complete!")
    print("=" * 60)
    print(f"\nBest Accuracy: {results['best_accuracy']:.4f}")
    print(f"Total Time: {results['total_time'] / 60:.1f} minutes")
    print(f"\nModel saved to: {MODEL_DIR}")
    print("\nNext steps:")
    print("  1. Run 'python evaluate.py' to evaluate the model")
    print("  2. Run 'python inference.py' to test the chatbot")


if __name__ == '__main__':
    main()

"""
Evaluation Module for IT Help Desk Chatbot

Features:
- Comprehensive metrics (accuracy, precision, recall, F1)
- Confusion matrix visualization
- Per-intent analysis
- Error analysis
- Sample predictions
"""

import json
import os
from typing import Dict, List, Tuple, Optional
from collections import defaultdict
from datetime import datetime
import random

import torch
import torch.nn as nn
import numpy as np

from config import (
    MODEL_CONFIG, DATA_CONFIG, INFERENCE_CONFIG,
    MODEL_DIR, LOG_DIR
)
from model import IntentClassifier
from tokenizer import SimpleTokenizer


class Evaluator:
    """Comprehensive model evaluation"""
    
    def __init__(self, 
                 model: IntentClassifier,
                 tokenizer: SimpleTokenizer,
                 intent_map: Dict,
                 device: str = None):
        self.model = model
        self.tokenizer = tokenizer
        self.intent_map = intent_map
        self.idx_to_intent = {v: k for k, v in intent_map['intent_to_idx'].items()}
        self.device = device or ('cuda' if torch.cuda.is_available() else 'cpu')
        self.model.to(self.device)
        self.model.eval()
    
    @torch.no_grad()
    def predict_batch(self, texts: List[str]) -> List[Dict]:
        """Predict for a batch of texts"""
        results = []
        
        for text in texts:
            encoded = self.tokenizer.encode(
                text,
                max_length=MODEL_CONFIG.max_seq_length,
                padding=True,
                truncation=True
            )
            
            input_ids = torch.tensor([encoded['input_ids']], device=self.device)
            attention_mask = torch.tensor([encoded['attention_mask']], device=self.device)
            
            output = self.model(input_ids, attention_mask)
            probs = output['probabilities'][0]
            
            top_k_probs, top_k_indices = probs.topk(5)
            
            predictions = []
            for prob, idx in zip(top_k_probs.tolist(), top_k_indices.tolist()):
                predictions.append({
                    'intent': self.idx_to_intent.get(idx, f'unknown_{idx}'),
                    'confidence': prob
                })
            
            results.append({
                'text': text,
                'predictions': predictions,
                'top_intent': predictions[0]['intent'],
                'top_confidence': predictions[0]['confidence']
            })
        
        return results
    
    def evaluate_dataset(self, test_data: List[Dict]) -> Dict:
        """Evaluate on test dataset"""
        correct = 0
        top3_correct = 0
        top5_correct = 0
        total = 0
        
        per_intent_stats = defaultdict(lambda: {
            'tp': 0, 'fp': 0, 'fn': 0, 'total': 0, 'correct': 0
        })
        
        predictions = []
        errors = []
        
        for sample in test_data:
            text = sample['text']
            true_idx = sample['intent_idx']
            true_intent = self.idx_to_intent.get(true_idx, f'unknown_{true_idx}')
            
            # Get prediction
            result = self.predict_batch([text])[0]
            pred_intent = result['top_intent']
            confidence = result['top_confidence']
            
            # Top-k accuracy
            pred_intents = [p['intent'] for p in result['predictions']]
            
            is_correct = (pred_intent == true_intent)
            in_top3 = true_intent in pred_intents[:3]
            in_top5 = true_intent in pred_intents[:5]
            
            if is_correct:
                correct += 1
                per_intent_stats[true_intent]['tp'] += 1
                per_intent_stats[true_intent]['correct'] += 1
            else:
                per_intent_stats[true_intent]['fn'] += 1
                per_intent_stats[pred_intent]['fp'] += 1
                errors.append({
                    'text': text,
                    'true_intent': true_intent,
                    'predicted_intent': pred_intent,
                    'confidence': confidence,
                    'top3': pred_intents[:3]
                })
            
            if in_top3:
                top3_correct += 1
            if in_top5:
                top5_correct += 1
            
            per_intent_stats[true_intent]['total'] += 1
            total += 1
            
            predictions.append({
                'text': text[:50] + '...' if len(text) > 50 else text,
                'true': true_intent,
                'predicted': pred_intent,
                'confidence': confidence,
                'correct': is_correct
            })
        
        # Calculate overall metrics
        accuracy = correct / total
        top3_accuracy = top3_correct / total
        top5_accuracy = top5_correct / total
        
        # Calculate per-intent precision, recall, F1
        intent_metrics = {}
        for intent, stats in per_intent_stats.items():
            tp = stats['tp']
            fp = stats['fp']
            fn = stats['fn']
            
            precision = tp / (tp + fp) if (tp + fp) > 0 else 0
            recall = tp / (tp + fn) if (tp + fn) > 0 else 0
            f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0
            
            intent_metrics[intent] = {
                'precision': precision,
                'recall': recall,
                'f1': f1,
                'support': stats['total'],
                'correct': stats['correct']
            }
        
        # Macro-averaged metrics
        precisions = [m['precision'] for m in intent_metrics.values() if m['support'] > 0]
        recalls = [m['recall'] for m in intent_metrics.values() if m['support'] > 0]
        f1s = [m['f1'] for m in intent_metrics.values() if m['support'] > 0]
        
        macro_precision = np.mean(precisions) if precisions else 0
        macro_recall = np.mean(recalls) if recalls else 0
        macro_f1 = np.mean(f1s) if f1s else 0
        
        # Build confusion matrix
        confusion_matrix = self._build_confusion_matrix(predictions, list(per_intent_stats.keys()))
        
        return {
            'accuracy': accuracy,
            'top3_accuracy': top3_accuracy,
            'top5_accuracy': top5_accuracy,
            'macro_precision': macro_precision,
            'macro_recall': macro_recall,
            'macro_f1': macro_f1,
            'total_samples': total,
            'correct_samples': correct,
            'intent_metrics': intent_metrics,
            'confusion_matrix': confusion_matrix,
            'errors': errors[:50],  # Keep first 50 errors
            'predictions': predictions
        }
    
    def _build_confusion_matrix(self, predictions: List[Dict], intents: List[str]) -> Dict:
        """Build confusion matrix"""
        intent_to_idx = {intent: i for i, intent in enumerate(intents)}
        n = len(intents)
        matrix = [[0] * n for _ in range(n)]
        
        for pred in predictions:
            true_intent = pred['true']
            pred_intent = pred['predicted']
            
            if true_intent in intent_to_idx and pred_intent in intent_to_idx:
                true_idx = intent_to_idx[true_intent]
                pred_idx = intent_to_idx[pred_intent]
                matrix[true_idx][pred_idx] += 1
        
        return {
            'matrix': matrix,
            'labels': intents
        }
    
    def analyze_confidence_distribution(self, test_data: List[Dict]) -> Dict:
        """Analyze confidence score distribution"""
        correct_confidences = []
        incorrect_confidences = []
        
        for sample in test_data:
            text = sample['text']
            true_idx = sample['intent_idx']
            true_intent = self.idx_to_intent.get(true_idx, f'unknown_{true_idx}')
            
            result = self.predict_batch([text])[0]
            confidence = result['top_confidence']
            
            if result['top_intent'] == true_intent:
                correct_confidences.append(confidence)
            else:
                incorrect_confidences.append(confidence)
        
        return {
            'correct': {
                'mean': np.mean(correct_confidences) if correct_confidences else 0,
                'std': np.std(correct_confidences) if correct_confidences else 0,
                'min': min(correct_confidences) if correct_confidences else 0,
                'max': max(correct_confidences) if correct_confidences else 0,
            },
            'incorrect': {
                'mean': np.mean(incorrect_confidences) if incorrect_confidences else 0,
                'std': np.std(incorrect_confidences) if incorrect_confidences else 0,
                'min': min(incorrect_confidences) if incorrect_confidences else 0,
                'max': max(incorrect_confidences) if incorrect_confidences else 0,
            }
        }
    
    def print_report(self, results: Dict):
        """Print evaluation report"""
        print("\n" + "=" * 70)
        print(" IT Help Desk Chatbot - Evaluation Report")
        print("=" * 70)
        
        # Overall metrics
        print("\n📊 OVERALL METRICS")
        print("-" * 50)
        print(f"  Accuracy:        {results['accuracy']:.4f} ({results['accuracy']*100:.2f}%)")
        print(f"  Top-3 Accuracy:  {results['top3_accuracy']:.4f} ({results['top3_accuracy']*100:.2f}%)")
        print(f"  Top-5 Accuracy:  {results['top5_accuracy']:.4f} ({results['top5_accuracy']*100:.2f}%)")
        print(f"  Macro Precision: {results['macro_precision']:.4f}")
        print(f"  Macro Recall:    {results['macro_recall']:.4f}")
        print(f"  Macro F1-Score:  {results['macro_f1']:.4f}")
        print(f"  Total Samples:   {results['total_samples']}")
        
        # Per-intent metrics
        print("\n📋 PER-INTENT METRICS")
        print("-" * 70)
        print(f"{'Intent':<35} {'Precision':<12} {'Recall':<12} {'F1':<12} {'Support'}")
        print("-" * 70)
        
        # Sort by support
        sorted_intents = sorted(
            results['intent_metrics'].items(),
            key=lambda x: x[1]['support'],
            reverse=True
        )
        
        for intent, metrics in sorted_intents:
            print(f"{intent[:34]:<35} {metrics['precision']:.4f}       "
                  f"{metrics['recall']:.4f}       {metrics['f1']:.4f}       "
                  f"{metrics['support']}")
        
        # Top errors
        if results['errors']:
            print("\n❌ SAMPLE ERRORS (First 10)")
            print("-" * 70)
            for i, error in enumerate(results['errors'][:10], 1):
                print(f"\n  {i}. Text: \"{error['text'][:60]}...\"")
                print(f"     True: {error['true_intent']}")
                print(f"     Predicted: {error['predicted_intent']} (conf: {error['confidence']:.4f})")
                print(f"     Top-3: {error['top3']}")
        
        # Summary
        print("\n" + "=" * 70)
        print("SUMMARY")
        print("=" * 70)
        
        if results['accuracy'] >= 0.90:
            print("✅ Excellent! Model achieves >90% accuracy.")
        elif results['accuracy'] >= 0.80:
            print("✅ Good performance. Model achieves >80% accuracy.")
        elif results['accuracy'] >= 0.70:
            print("⚠️ Moderate performance. Consider adding more training data.")
        else:
            print("❌ Low performance. Model needs improvement.")
        
        # Recommendations
        print("\n📌 RECOMMENDATIONS:")
        
        # Find underperforming intents
        poor_intents = [
            (intent, m) for intent, m in results['intent_metrics'].items()
            if m['f1'] < 0.7 and m['support'] > 5
        ]
        
        if poor_intents:
            print("\n  Low-performing intents (F1 < 0.7):")
            for intent, m in poor_intents[:5]:
                print(f"    - {intent}: F1={m['f1']:.3f} (support={m['support']})")
            print("    → Consider adding more training examples for these intents")


def load_model_and_tokenizer() -> Tuple[IntentClassifier, SimpleTokenizer, Dict]:
    """Load trained model and tokenizer"""
    # Load intent map
    with open(DATA_CONFIG.intent_map_path, 'r') as f:
        intent_map = json.load(f)
    
    # Load tokenizer
    tokenizer = SimpleTokenizer.load(MODEL_CONFIG.tokenizer_path)
    
    # Load model
    model_path = os.path.join(MODEL_DIR, 'best_model.pt')
    if not os.path.exists(model_path):
        model_path = os.path.join(MODEL_DIR, 'final_model.pt')
    
    checkpoint = torch.load(model_path, map_location='cpu', weights_only=False)
    
    model = IntentClassifier(
        vocab_size=checkpoint['model_config']['vocab_size'],
        embedding_dim=checkpoint['model_config']['embedding_dim'],
        num_intents=checkpoint['model_config']['num_intents'],
        num_layers=checkpoint['model_config']['num_layers'],
        num_heads=checkpoint['model_config']['num_heads'],
        hidden_dim=checkpoint['model_config']['hidden_dim'],
        max_seq_length=checkpoint['model_config']['max_seq_length'],
        dropout=checkpoint['model_config']['dropout']
    )
    
    model.load_state_dict(checkpoint['model_state_dict'])
    
    return model, tokenizer, intent_map


def main():
    """Main evaluation script"""
    print("=" * 60)
    print("IT Help Desk Chatbot - Evaluation")
    print("=" * 60)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Load model
    print("\n[1/3] Loading model and tokenizer...")
    try:
        model, tokenizer, intent_map = load_model_and_tokenizer()
        print(f"  ✅ Model loaded successfully")
        print(f"  Vocabulary size: {len(tokenizer)}")
        print(f"  Number of intents: {intent_map['num_intents']}")
    except FileNotFoundError:
        print("  ❌ Model not found. Please run train.py first.")
        return
    
    # Load test data
    print("\n[2/3] Loading test data...")
    with open(DATA_CONFIG.test_path, 'r') as f:
        test_data = json.load(f)
    print(f"  Test samples: {len(test_data)}")
    
    # Evaluate
    print("\n[3/3] Running evaluation...")
    evaluator = Evaluator(model, tokenizer, intent_map)
    results = evaluator.evaluate_dataset(test_data)
    
    # Print report
    evaluator.print_report(results)
    
    # Confidence analysis
    print("\n📈 CONFIDENCE DISTRIBUTION")
    print("-" * 50)
    conf_analysis = evaluator.analyze_confidence_distribution(test_data)
    print(f"  Correct predictions:")
    print(f"    Mean: {conf_analysis['correct']['mean']:.4f}, "
          f"Std: {conf_analysis['correct']['std']:.4f}")
    print(f"  Incorrect predictions:")
    print(f"    Mean: {conf_analysis['incorrect']['mean']:.4f}, "
          f"Std: {conf_analysis['incorrect']['std']:.4f}")
    
    # Save results
    results_path = os.path.join(LOG_DIR, 'evaluation_results.json')
    
    # Convert numpy types to Python types for JSON serialization
    def convert_numpy(obj):
        if isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, dict):
            return {k: convert_numpy(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [convert_numpy(v) for v in obj]
        return obj
    
    results_serializable = convert_numpy(results)
    
    with open(results_path, 'w') as f:
        json.dump(results_serializable, f, indent=2)
    
    print(f"\n✅ Results saved to {results_path}")
    
    # Interactive testing
    print("\n" + "=" * 60)
    print("Interactive Testing")
    print("=" * 60)
    print("Type a query to test the model (or 'quit' to exit):\n")
    
    while True:
        try:
            query = input("You: ").strip()
            if not query:
                continue
            if query.lower() in ['quit', 'exit', 'q']:
                break
            
            result = evaluator.predict_batch([query])[0]
            print(f"\n  Intent: {result['top_intent']}")
            print(f"  Confidence: {result['top_confidence']:.4f}")
            print(f"  Top-3 predictions:")
            for i, pred in enumerate(result['predictions'][:3], 1):
                print(f"    {i}. {pred['intent']} ({pred['confidence']:.4f})")
            print()
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"  Error: {e}")


if __name__ == '__main__':
    main()

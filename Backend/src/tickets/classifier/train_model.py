"""
Training Script for Ticket Classification Neural Network
Trains the model using the ticket dataset and saves the trained weights
"""

import os
import sys
import numpy as np
import pandas as pd
import joblib
from typing import Tuple

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from neural_network import NeuralNetwork
from config import (
    PRIORITY_ENCODING, TYPE_ENCODING, AGENT_ENCODING,
    AGENT_DECODING, PRIORITY_DECODING, TYPE_DECODING
)


def load_and_preprocess_data(csv_path: str) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """
    Load and preprocess the training data.
    
    Args:
        csv_path: Path to the CSV file
        
    Returns:
        X_train, X_test, y_train, y_test
    """
    print(f"Loading data from {csv_path}...")
    
    # Load CSV
    df = pd.read_csv(csv_path)
    print(f"Loaded {len(df)} samples")
    
    # Display data distribution
    print("\nData Distribution:")
    print(f"Priority distribution:\n{df['Priority'].value_counts()}")
    print(f"\nType distribution:\n{df['Type'].value_counts()}")
    print(f"\nAgent distribution:\n{df['Agent'].value_counts()}")
    
    # Encode features
    X = np.zeros((len(df), 2))
    X[:, 0] = df['Priority'].map(PRIORITY_ENCODING).values
    X[:, 1] = df['Type'].map(TYPE_ENCODING).values
    
    # Normalize features to 0-1 range
    X[:, 0] = X[:, 0] / 2.0  # Priority: 0, 0.5, 1
    X[:, 1] = X[:, 1] / 2.0  # Type: 0, 0.5, 1
    
    # Encode labels (one-hot encoding)
    y_labels = df['Agent'].map(AGENT_ENCODING).values
    y = np.zeros((len(df), 3))
    y[np.arange(len(df)), y_labels] = 1
    
    # Shuffle data
    indices = np.random.permutation(len(df))
    X = X[indices]
    y = y[indices]
    
    # Split into train and test (80/20)
    split_idx = int(0.8 * len(df))
    X_train, X_test = X[:split_idx], X[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]
    
    print(f"\nTraining samples: {len(X_train)}")
    print(f"Test samples: {len(X_test)}")
    
    return X_train, X_test, y_train, y_test


def train_model(X_train: np.ndarray, y_train: np.ndarray,
                X_test: np.ndarray, y_test: np.ndarray,
                epochs: int = 500, learning_rate: float = 0.5) -> NeuralNetwork:
    """
    Train the neural network model.
    
    Args:
        X_train: Training features
        y_train: Training labels
        X_test: Test features
        y_test: Test labels
        epochs: Number of training epochs
        learning_rate: Learning rate for optimization
        
    Returns:
        Trained NeuralNetwork instance
    """
    print("\n" + "="*50)
    print("Training Neural Network")
    print("="*50)
    print(f"Architecture: 2 -> 16 -> 8 -> 3")
    print(f"Activation: Sigmoid")
    print(f"Learning Rate: {learning_rate}")
    print(f"Epochs: {epochs}")
    print("="*50 + "\n")
    
    # Create neural network
    nn = NeuralNetwork(
        input_size=2,
        hidden1_size=16,
        hidden2_size=8,
        output_size=3,
        learning_rate=learning_rate
    )
    
    # Train
    nn.train(X_train, y_train, epochs=epochs, batch_size=64, verbose=True)
    
    # Evaluate
    train_accuracy = nn.evaluate(X_train, y_train)
    test_accuracy = nn.evaluate(X_test, y_test)
    
    print("\n" + "="*50)
    print("Training Complete!")
    print("="*50)
    print(f"Training Accuracy: {train_accuracy:.4f} ({train_accuracy*100:.2f}%)")
    print(f"Test Accuracy: {test_accuracy:.4f} ({test_accuracy*100:.2f}%)")
    print("="*50)
    
    return nn


def save_model(nn: NeuralNetwork, output_dir: str):
    """
    Save the trained model weights.
    
    Args:
        nn: Trained neural network
        output_dir: Directory to save the model
    """
    model_path = os.path.join(output_dir, 'ticket_classifier_model.joblib')
    weights = nn.get_weights()
    
    # Add metadata
    model_data = {
        'weights': weights,
        'input_size': nn.input_size,
        'hidden1_size': nn.hidden1_size,
        'hidden2_size': nn.hidden2_size,
        'output_size': nn.output_size,
        'priority_encoding': PRIORITY_ENCODING,
        'type_encoding': TYPE_ENCODING,
        'agent_encoding': AGENT_ENCODING,
        'agent_decoding': AGENT_DECODING,
    }
    
    joblib.dump(model_data, model_path)
    print(f"\nModel saved to: {model_path}")


def test_predictions(nn: NeuralNetwork):
    """Test the model with sample predictions."""
    print("\n" + "="*50)
    print("Sample Predictions")
    print("="*50)
    
    test_cases = [
        ("high", "software"),
        ("high", "hardware"),
        ("high", "network"),
        ("medium", "software"),
        ("medium", "hardware"),
        ("medium", "network"),
        ("low", "software"),
        ("low", "hardware"),
        ("low", "network"),
    ]
    
    for priority, ticket_type in test_cases:
        # Encode input
        x = np.array([[
            PRIORITY_ENCODING[priority] / 2.0,
            TYPE_ENCODING[ticket_type] / 2.0
        ]])
        
        # Predict
        proba = nn.predict_proba(x)[0]
        prediction = nn.predict(x)[0]
        predicted_agent = AGENT_DECODING[prediction]
        
        print(f"Priority: {priority:6s} | Type: {ticket_type:8s} | "
              f"Predicted: {predicted_agent} | "
              f"Probabilities: A1={proba[0]:.3f}, A2={proba[1]:.3f}, A3={proba[2]:.3f}")


def main():
    """Main training function."""
    # Set random seed for reproducibility
    np.random.seed(42)
    
    # Paths
    script_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(script_dir, '..', 'train.csv')
    
    # Load and preprocess data
    X_train, X_test, y_train, y_test = load_and_preprocess_data(csv_path)
    
    # Train model
    nn = train_model(X_train, y_train, X_test, y_test, epochs=500, learning_rate=0.5)
    
    # Save model
    save_model(nn, script_dir)
    
    # Test predictions
    test_predictions(nn)
    
    print("\n✅ Training complete! Model ready for use.")


if __name__ == "__main__":
    main()

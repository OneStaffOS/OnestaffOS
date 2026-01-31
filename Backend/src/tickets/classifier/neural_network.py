"""
Neural Network Implementation for Ticket Classification
Uses sigmoid activation function as specified
"""

import numpy as np
from typing import List, Tuple, Optional


class NeuralNetwork:
    """
    A simple feedforward neural network with sigmoid activation
    for ticket classification.
    
    Architecture:
    - Input layer: 2 neurons (priority, type)
    - Hidden layer 1: 16 neurons
    - Hidden layer 2: 8 neurons
    - Output layer: 3 neurons (one for each agent)
    """
    
    def __init__(self, input_size: int = 2, hidden1_size: int = 16, 
                 hidden2_size: int = 8, output_size: int = 3,
                 learning_rate: float = 0.1):
        """
        Initialize the neural network with random weights.
        
        Args:
            input_size: Number of input features
            hidden1_size: Number of neurons in first hidden layer
            hidden2_size: Number of neurons in second hidden layer
            output_size: Number of output classes (agents)
            learning_rate: Learning rate for gradient descent
        """
        self.input_size = input_size
        self.hidden1_size = hidden1_size
        self.hidden2_size = hidden2_size
        self.output_size = output_size
        self.learning_rate = learning_rate
        
        # Initialize weights with Xavier initialization
        self.weights_input_hidden1 = np.random.randn(input_size, hidden1_size) * np.sqrt(2.0 / input_size)
        self.bias_hidden1 = np.zeros((1, hidden1_size))
        
        self.weights_hidden1_hidden2 = np.random.randn(hidden1_size, hidden2_size) * np.sqrt(2.0 / hidden1_size)
        self.bias_hidden2 = np.zeros((1, hidden2_size))
        
        self.weights_hidden2_output = np.random.randn(hidden2_size, output_size) * np.sqrt(2.0 / hidden2_size)
        self.bias_output = np.zeros((1, output_size))
        
        # Store training history
        self.loss_history = []
        
    def sigmoid(self, x: np.ndarray) -> np.ndarray:
        """Sigmoid activation function."""
        # Clip values to prevent overflow
        x = np.clip(x, -500, 500)
        return 1 / (1 + np.exp(-x))
    
    def sigmoid_derivative(self, x: np.ndarray) -> np.ndarray:
        """Derivative of sigmoid function."""
        return x * (1 - x)
    
    def softmax(self, x: np.ndarray) -> np.ndarray:
        """Softmax function for output layer."""
        exp_x = np.exp(x - np.max(x, axis=1, keepdims=True))
        return exp_x / np.sum(exp_x, axis=1, keepdims=True)
    
    def forward(self, X: np.ndarray) -> Tuple[np.ndarray, dict]:
        """
        Forward propagation through the network.
        
        Args:
            X: Input data of shape (n_samples, input_size)
            
        Returns:
            Output predictions and cache of intermediate values
        """
        # Input to hidden layer 1
        z1 = np.dot(X, self.weights_input_hidden1) + self.bias_hidden1
        a1 = self.sigmoid(z1)
        
        # Hidden layer 1 to hidden layer 2
        z2 = np.dot(a1, self.weights_hidden1_hidden2) + self.bias_hidden2
        a2 = self.sigmoid(z2)
        
        # Hidden layer 2 to output
        z3 = np.dot(a2, self.weights_hidden2_output) + self.bias_output
        a3 = self.softmax(z3)
        
        cache = {
            'z1': z1, 'a1': a1,
            'z2': z2, 'a2': a2,
            'z3': z3, 'a3': a3
        }
        
        return a3, cache
    
    def backward(self, X: np.ndarray, y: np.ndarray, cache: dict) -> dict:
        """
        Backward propagation to compute gradients.
        
        Args:
            X: Input data
            y: True labels (one-hot encoded)
            cache: Cached values from forward pass
            
        Returns:
            Dictionary of gradients
        """
        m = X.shape[0]
        
        a1 = cache['a1']
        a2 = cache['a2']
        a3 = cache['a3']
        
        # Output layer error
        dz3 = a3 - y
        dw3 = (1/m) * np.dot(a2.T, dz3)
        db3 = (1/m) * np.sum(dz3, axis=0, keepdims=True)
        
        # Hidden layer 2 error
        dz2 = np.dot(dz3, self.weights_hidden2_output.T) * self.sigmoid_derivative(a2)
        dw2 = (1/m) * np.dot(a1.T, dz2)
        db2 = (1/m) * np.sum(dz2, axis=0, keepdims=True)
        
        # Hidden layer 1 error
        dz1 = np.dot(dz2, self.weights_hidden1_hidden2.T) * self.sigmoid_derivative(a1)
        dw1 = (1/m) * np.dot(X.T, dz1)
        db1 = (1/m) * np.sum(dz1, axis=0, keepdims=True)
        
        gradients = {
            'dw1': dw1, 'db1': db1,
            'dw2': dw2, 'db2': db2,
            'dw3': dw3, 'db3': db3
        }
        
        return gradients
    
    def update_weights(self, gradients: dict):
        """Update weights using gradient descent."""
        self.weights_input_hidden1 -= self.learning_rate * gradients['dw1']
        self.bias_hidden1 -= self.learning_rate * gradients['db1']
        
        self.weights_hidden1_hidden2 -= self.learning_rate * gradients['dw2']
        self.bias_hidden2 -= self.learning_rate * gradients['db2']
        
        self.weights_hidden2_output -= self.learning_rate * gradients['dw3']
        self.bias_output -= self.learning_rate * gradients['db3']
    
    def compute_loss(self, y_true: np.ndarray, y_pred: np.ndarray) -> float:
        """
        Compute cross-entropy loss.
        
        Args:
            y_true: True labels (one-hot encoded)
            y_pred: Predicted probabilities
            
        Returns:
            Cross-entropy loss
        """
        m = y_true.shape[0]
        # Add small epsilon to prevent log(0)
        epsilon = 1e-15
        y_pred = np.clip(y_pred, epsilon, 1 - epsilon)
        loss = -np.sum(y_true * np.log(y_pred)) / m
        return loss
    
    def train(self, X: np.ndarray, y: np.ndarray, epochs: int = 1000,
              batch_size: int = 32, verbose: bool = True) -> List[float]:
        """
        Train the neural network.
        
        Args:
            X: Training data
            y: Training labels (one-hot encoded)
            epochs: Number of training epochs
            batch_size: Size of mini-batches
            verbose: Whether to print progress
            
        Returns:
            List of loss values per epoch
        """
        m = X.shape[0]
        self.loss_history = []
        
        for epoch in range(epochs):
            # Shuffle data
            indices = np.random.permutation(m)
            X_shuffled = X[indices]
            y_shuffled = y[indices]
            
            # Mini-batch training
            for i in range(0, m, batch_size):
                X_batch = X_shuffled[i:i+batch_size]
                y_batch = y_shuffled[i:i+batch_size]
                
                # Forward pass
                output, cache = self.forward(X_batch)
                
                # Backward pass
                gradients = self.backward(X_batch, y_batch, cache)
                
                # Update weights
                self.update_weights(gradients)
            
            # Compute loss for the epoch
            output, _ = self.forward(X)
            loss = self.compute_loss(y, output)
            self.loss_history.append(loss)
            
            if verbose and (epoch + 1) % 100 == 0:
                accuracy = self.evaluate(X, y)
                print(f"Epoch {epoch + 1}/{epochs} - Loss: {loss:.4f} - Accuracy: {accuracy:.4f}")
        
        return self.loss_history
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        """
        Make predictions.
        
        Args:
            X: Input data
            
        Returns:
            Predicted class indices
        """
        output, _ = self.forward(X)
        return np.argmax(output, axis=1)
    
    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """
        Get prediction probabilities.
        
        Args:
            X: Input data
            
        Returns:
            Probability distribution over classes
        """
        output, _ = self.forward(X)
        return output
    
    def evaluate(self, X: np.ndarray, y: np.ndarray) -> float:
        """
        Evaluate model accuracy.
        
        Args:
            X: Test data
            y: True labels (one-hot encoded)
            
        Returns:
            Accuracy score
        """
        predictions = self.predict(X)
        true_labels = np.argmax(y, axis=1)
        accuracy = np.mean(predictions == true_labels)
        return accuracy
    
    def get_weights(self) -> dict:
        """Get all weights and biases."""
        return {
            'weights_input_hidden1': self.weights_input_hidden1,
            'bias_hidden1': self.bias_hidden1,
            'weights_hidden1_hidden2': self.weights_hidden1_hidden2,
            'bias_hidden2': self.bias_hidden2,
            'weights_hidden2_output': self.weights_hidden2_output,
            'bias_output': self.bias_output,
        }
    
    def set_weights(self, weights: dict):
        """Set all weights and biases."""
        self.weights_input_hidden1 = weights['weights_input_hidden1']
        self.bias_hidden1 = weights['bias_hidden1']
        self.weights_hidden1_hidden2 = weights['weights_hidden1_hidden2']
        self.bias_hidden2 = weights['bias_hidden2']
        self.weights_hidden2_output = weights['weights_hidden2_output']
        self.bias_output = weights['bias_output']

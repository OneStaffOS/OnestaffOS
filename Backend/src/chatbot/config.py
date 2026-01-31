"""
Configuration file for IT Help Desk Chatbot
"""

import os
from dataclasses import dataclass
from typing import List, Optional

# Base paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
MODEL_DIR = os.path.join(BASE_DIR, 'models')
LOG_DIR = os.path.join(BASE_DIR, 'logs')

# Create directories if they don't exist
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(MODEL_DIR, exist_ok=True)
os.makedirs(LOG_DIR, exist_ok=True)


@dataclass
class ModelConfig:
    """Small Transformer configuration for intent classification"""
    
    # Embedding settings
    vocab_size: int = 5000
    embedding_dim: int = 128
    max_seq_length: int = 128
    
    # Transformer architecture
    num_layers: int = 4
    num_heads: int = 4
    hidden_dim: int = 256
    dropout: float = 0.1
    
    # Classification head
    num_intents: int = 45  # Will be set dynamically
    
    # Training settings
    learning_rate: float = 1e-4
    weight_decay: float = 0.01
    batch_size: int = 32
    num_epochs: int = 50
    warmup_steps: int = 100
    
    # Inference settings
    confidence_threshold: float = 0.7
    fallback_threshold: float = 0.4
    
    # Paths
    model_path: str = os.path.join(MODEL_DIR, 'helpdesk_model.pt')
    tokenizer_path: str = os.path.join(MODEL_DIR, 'tokenizer.json')


@dataclass
class DataConfig:
    """Data processing configuration"""
    
    # Source files
    knowledge_data_path: str = os.path.join(BASE_DIR, 'knowledge-data.json')
    intent_data_path: str = os.path.join(BASE_DIR, 'Intent.json')
    
    # Processed data paths
    train_path: str = os.path.join(DATA_DIR, 'train.json')
    valid_path: str = os.path.join(DATA_DIR, 'valid.json')
    test_path: str = os.path.join(DATA_DIR, 'test.json')
    
    # Intent mapping
    intent_map_path: str = os.path.join(DATA_DIR, 'intent_map.json')
    
    # Split ratios
    train_ratio: float = 0.8
    valid_ratio: float = 0.1
    test_ratio: float = 0.1
    
    # Preprocessing
    lowercase: bool = True
    remove_punctuation: bool = False  # Keep some punctuation for context
    min_pattern_length: int = 2
    max_pattern_length: int = 100
    
    # Augmentation
    use_augmentation: bool = True
    augmentation_factor: int = 2


@dataclass 
class TrainingConfig:
    """Training hyperparameters"""
    
    # Optimizer
    optimizer: str = 'adamw'
    learning_rate: float = 3e-4
    weight_decay: float = 0.01
    beta1: float = 0.9
    beta2: float = 0.999
    epsilon: float = 1e-8
    
    # Learning rate schedule
    scheduler: str = 'cosine'  # 'cosine', 'linear', 'constant'
    warmup_ratio: float = 0.1
    
    # Training
    batch_size: int = 16
    num_epochs: int = 100
    gradient_clip: float = 1.0
    
    # Regularization
    dropout: float = 0.1
    label_smoothing: float = 0.1
    
    # Early stopping
    patience: int = 15
    min_delta: float = 0.001
    
    # Checkpointing
    save_best_only: bool = True
    save_every_n_epochs: int = 10
    
    # Logging
    log_every_n_steps: int = 10
    eval_every_n_steps: int = 100


@dataclass
class InferenceConfig:
    """Inference configuration"""
    
    # Thresholds
    confidence_threshold: float = 0.25
    fallback_threshold: float = 0.15
    
    # Response selection
    use_random_response: bool = True  # Randomly select from matching responses
    
    # Entity extraction
    extract_entities: bool = True
    
    # Context management
    use_context: bool = True
    context_window: int = 3  # Number of previous turns to consider
    
    # Escalation
    auto_escalate_frustrated: bool = True
    auto_escalate_security: bool = True
    escalation_threshold: float = 0.3  # Escalate if confidence below this


# Default configurations
MODEL_CONFIG = ModelConfig()
DATA_CONFIG = DataConfig()
TRAINING_CONFIG = TrainingConfig()
INFERENCE_CONFIG = InferenceConfig()


# Intent categories mapping
INTENT_CATEGORIES = {
    'account': ['password_reset', 'login_issues', 'mfa_setup', 'account_unlock'],
    'network': ['vpn_connection', 'wifi_issues', 'network_connectivity', 'firewall_issues'],
    'software': ['email_issues', 'office_365', 'software_installation', 'teams_issues', 
                 'browser_issues', 'backup_recovery', 'calendar_sync', 'update_issues',
                 'video_conferencing', 'mobile_email'],
    'hardware': ['printer_issues', 'monitor_display', 'keyboard_mouse', 'laptop_issues', 'system_slow'],
    'hr-systems': ['hr_leave_request', 'hr_payroll', 'hr_benefits', 'performance_review'],
    'security': ['security_phishing', 'security_virus', 'security_password_policy'],
    'general': ['greeting', 'goodbye', 'thanks', 'frustrated', 'ticket_status', 
                'new_employee', 'equipment_request', 'remote_work', 'data_transfer', 
                'create_ticket', 'default_fallback']
}


# Priority intents that need escalation
ESCALATION_INTENTS = [
    'security_phishing',
    'security_virus', 
    'frustrated',
    'account_unlock',
    'laptop_issues'
]


# Quick response templates
QUICK_RESPONSES = {
    'restart': "Have you tried restarting your device? This often resolves many common issues.",
    'cache': "Try clearing your browser cache and cookies, then restart the browser.",
    'connection': "Please check your internet connection and try again.",
    'update': "Make sure your software is updated to the latest version.",
    'ticket': "For this issue, please contact IT Support directly."
}

"""
Custom Tokenizer for IT Help Desk Chatbot

Implements a simple but effective tokenizer optimized for IT support text:
- Word-level tokenization with subword fallback
- Special handling for IT terminology
- Vocabulary management
"""

import json
import re
from typing import List, Dict, Tuple, Optional
from collections import Counter
import os

from config import MODEL_CONFIG, DATA_CONFIG


class SimpleTokenizer:
    """
    Word-level tokenizer with special token handling for IT support domain.
    
    Features:
    - Handles IT terminology (VPN, DNS, 2FA, etc.)
    - Preserves important punctuation
    - Handles unknown words gracefully
    - Supports special tokens (PAD, UNK, CLS, SEP)
    """
    
    # Special tokens
    PAD_TOKEN = '[PAD]'
    UNK_TOKEN = '[UNK]'
    CLS_TOKEN = '[CLS]'
    SEP_TOKEN = '[SEP]'
    MASK_TOKEN = '[MASK]'
    
    # IT-specific terms to always keep whole
    IT_TERMS = {
        'vpn', 'dns', 'dhcp', 'ip', 'tcp', 'udp', 'http', 'https', 'ssl', 'tls',
        'wifi', 'lan', 'wan', 'usb', 'hdmi', 'ssd', 'hdd', 'ram', 'cpu', 'gpu',
        'bios', 'uefi', 'os', 'api', 'url', 'html', 'css', 'pdf', 'doc', 'xlsx',
        '2fa', 'mfa', 'sso', 'ldap', 'ad', 'gpo', 'ou', 'dc', 'fqdn',
        'ms', 'kb', 'mb', 'gb', 'tb', 'fps', 'dpi', 'ppi',
        'cmd', 'exe', 'dll', 'sys', 'ini', 'bat', 'ps1', 'sh',
        'outlook', 'teams', 'onedrive', 'sharepoint', 'azure', 'office365',
        'chrome', 'firefox', 'edge', 'safari', 'zoom', 'slack',
        'windows', 'macos', 'linux', 'ios', 'android',
        'admin', 'sudo', 'root', 'localhost', 'ipconfig', 'ping', 'traceroute',
    }
    
    def __init__(self, vocab_size: int = MODEL_CONFIG.vocab_size):
        self.vocab_size = vocab_size
        self.word_to_idx: Dict[str, int] = {}
        self.idx_to_word: Dict[int, str] = {}
        self.word_freq: Counter = Counter()
        self.is_fitted = False
        
        # Initialize special tokens
        self._init_special_tokens()
    
    def _init_special_tokens(self):
        """Initialize special tokens in vocabulary"""
        special_tokens = [
            self.PAD_TOKEN,
            self.UNK_TOKEN, 
            self.CLS_TOKEN,
            self.SEP_TOKEN,
            self.MASK_TOKEN,
        ]
        
        for idx, token in enumerate(special_tokens):
            self.word_to_idx[token] = idx
            self.idx_to_word[idx] = token
        
        self.special_token_count = len(special_tokens)
    
    @property
    def pad_token_id(self) -> int:
        return self.word_to_idx[self.PAD_TOKEN]
    
    @property
    def unk_token_id(self) -> int:
        return self.word_to_idx[self.UNK_TOKEN]
    
    @property
    def cls_token_id(self) -> int:
        return self.word_to_idx[self.CLS_TOKEN]
    
    @property
    def sep_token_id(self) -> int:
        return self.word_to_idx[self.SEP_TOKEN]
    
    def _tokenize_text(self, text: str) -> List[str]:
        """
        Tokenize text into words/tokens.
        
        Strategy:
        1. Lowercase
        2. Handle IT terms specially
        3. Split on whitespace and punctuation
        4. Keep important punctuation as tokens
        """
        text = text.lower().strip()
        
        # Protect IT terms with underscores
        for term in self.IT_TERMS:
            pattern = rf'\b{re.escape(term)}\b'
            text = re.sub(pattern, f'__{term}__', text, flags=re.IGNORECASE)
        
        # Split into tokens
        # Keep contractions, numbers, and some punctuation
        tokens = re.findall(r'__\w+__|[\w\']+|[.?!,]', text)
        
        # Remove protection underscores
        tokens = [t.strip('_') for t in tokens]
        
        return tokens
    
    def fit(self, texts: List[str]) -> 'SimpleTokenizer':
        """
        Build vocabulary from training texts.
        
        Args:
            texts: List of training texts
            
        Returns:
            self for chaining
        """
        print(f"Building vocabulary from {len(texts)} texts...")
        
        # Count word frequencies
        self.word_freq = Counter()
        for text in texts:
            tokens = self._tokenize_text(text)
            self.word_freq.update(tokens)
        
        print(f"Found {len(self.word_freq)} unique tokens")
        
        # Keep top vocab_size - special_tokens words
        available_slots = self.vocab_size - self.special_token_count
        most_common = self.word_freq.most_common(available_slots)
        
        # Build vocabulary
        for word, _ in most_common:
            if word not in self.word_to_idx:
                idx = len(self.word_to_idx)
                self.word_to_idx[word] = idx
                self.idx_to_word[idx] = word
        
        self.is_fitted = True
        print(f"Vocabulary size: {len(self.word_to_idx)}")
        
        return self
    
    def encode(self, text: str, 
               max_length: int = MODEL_CONFIG.max_seq_length,
               add_special_tokens: bool = True,
               padding: bool = True,
               truncation: bool = True) -> Dict[str, List[int]]:
        """
        Encode text to token IDs.
        
        Args:
            text: Input text
            max_length: Maximum sequence length
            add_special_tokens: Whether to add [CLS] and [SEP]
            padding: Whether to pad to max_length
            truncation: Whether to truncate to max_length
            
        Returns:
            Dictionary with 'input_ids' and 'attention_mask'
        """
        if not self.is_fitted:
            raise ValueError("Tokenizer must be fitted before encoding")
        
        # Tokenize
        tokens = self._tokenize_text(text)
        
        # Convert to IDs
        token_ids = [self.word_to_idx.get(t, self.unk_token_id) for t in tokens]
        
        # Add special tokens
        if add_special_tokens:
            token_ids = [self.cls_token_id] + token_ids + [self.sep_token_id]
        
        # Truncate
        if truncation and len(token_ids) > max_length:
            token_ids = token_ids[:max_length-1] + [self.sep_token_id]
        
        # Create attention mask (1 for real tokens, 0 for padding)
        attention_mask = [1] * len(token_ids)
        
        # Pad
        if padding:
            pad_length = max_length - len(token_ids)
            token_ids = token_ids + [self.pad_token_id] * pad_length
            attention_mask = attention_mask + [0] * pad_length
        
        return {
            'input_ids': token_ids,
            'attention_mask': attention_mask
        }
    
    def encode_batch(self, texts: List[str], **kwargs) -> Dict[str, List[List[int]]]:
        """Encode a batch of texts"""
        batch_input_ids = []
        batch_attention_mask = []
        
        for text in texts:
            encoded = self.encode(text, **kwargs)
            batch_input_ids.append(encoded['input_ids'])
            batch_attention_mask.append(encoded['attention_mask'])
        
        return {
            'input_ids': batch_input_ids,
            'attention_mask': batch_attention_mask
        }
    
    def decode(self, token_ids: List[int], skip_special_tokens: bool = True) -> str:
        """Decode token IDs back to text"""
        tokens = []
        special_ids = {self.pad_token_id, self.cls_token_id, self.sep_token_id}
        
        for idx in token_ids:
            if skip_special_tokens and idx in special_ids:
                continue
            
            token = self.idx_to_word.get(idx, self.UNK_TOKEN)
            if token != self.UNK_TOKEN or not skip_special_tokens:
                tokens.append(token)
        
        # Join tokens, handling punctuation
        text = ''
        for i, token in enumerate(tokens):
            if token in '.?!,':
                text += token
            elif i > 0:
                text += ' ' + token
            else:
                text += token
        
        return text
    
    def save(self, filepath: str = MODEL_CONFIG.tokenizer_path) -> None:
        """Save tokenizer to file"""
        data = {
            'vocab_size': self.vocab_size,
            'word_to_idx': self.word_to_idx,
            'idx_to_word': {str(k): v for k, v in self.idx_to_word.items()},
            'word_freq': dict(self.word_freq.most_common(10000)),
            'special_token_count': self.special_token_count,
        }
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        
        print(f"✅ Tokenizer saved to {filepath}")
    
    @classmethod
    def load(cls, filepath: str = MODEL_CONFIG.tokenizer_path) -> 'SimpleTokenizer':
        """Load tokenizer from file"""
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        tokenizer = cls(vocab_size=data['vocab_size'])
        tokenizer.word_to_idx = data['word_to_idx']
        tokenizer.idx_to_word = {int(k): v for k, v in data['idx_to_word'].items()}
        tokenizer.word_freq = Counter(data.get('word_freq', {}))
        tokenizer.special_token_count = data['special_token_count']
        tokenizer.is_fitted = True
        
        print(f"✅ Tokenizer loaded from {filepath}")
        return tokenizer
    
    def __len__(self) -> int:
        return len(self.word_to_idx)


def build_tokenizer_from_data() -> SimpleTokenizer:
    """Build tokenizer from processed training data"""
    # Load training data
    if not os.path.exists(DATA_CONFIG.train_path):
        raise FileNotFoundError(
            f"Training data not found at {DATA_CONFIG.train_path}. "
            "Run preprocess.py first."
        )
    
    with open(DATA_CONFIG.train_path, 'r', encoding='utf-8') as f:
        train_data = json.load(f)
    
    # Extract texts
    texts = [sample['text'] for sample in train_data]
    
    # Also add responses to vocabulary
    for sample in train_data:
        for response in sample.get('responses', []):
            texts.append(response)
    
    # Build tokenizer
    tokenizer = SimpleTokenizer()
    tokenizer.fit(texts)
    tokenizer.save()
    
    return tokenizer


def main():
    """Test tokenizer"""
    print("=" * 60)
    print("Building Tokenizer")
    print("=" * 60)
    
    tokenizer = build_tokenizer_from_data()
    
    # Test encoding/decoding
    test_texts = [
        "I forgot my password and can't login",
        "VPN is not connecting to the server",
        "How do I reset my 2FA?",
        "My laptop is running slow",
        "Outlook keeps crashing when I open it",
    ]
    
    print("\n" + "=" * 60)
    print("Testing Tokenizer")
    print("=" * 60)
    
    for text in test_texts:
        encoded = tokenizer.encode(text, max_length=32)
        decoded = tokenizer.decode(encoded['input_ids'])
        
        print(f"\nOriginal: {text}")
        print(f"Token IDs: {encoded['input_ids'][:15]}...")
        print(f"Decoded: {decoded}")
    
    print(f"\n✅ Tokenizer ready with {len(tokenizer)} tokens")


if __name__ == '__main__':
    main()

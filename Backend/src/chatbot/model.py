"""
Small Transformer Model for Intent Classification

Architecture:
- Embedding layer (128-dim)
- Positional encoding
- 4 Transformer encoder layers (4 heads, 256 hidden)
- Classification head

Total parameters: ~2-3M
"""

import math
import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Optional, Tuple, Dict

from config import MODEL_CONFIG


class PositionalEncoding(nn.Module):
    """
    Sinusoidal positional encoding for transformer.
    Adds position information to token embeddings.
    """
    
    def __init__(self, d_model: int, max_len: int = 512, dropout: float = 0.1):
        super().__init__()
        self.dropout = nn.Dropout(p=dropout)
        
        # Create positional encoding matrix
        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, d_model, 2).float() * (-math.log(10000.0) / d_model))
        
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        pe = pe.unsqueeze(0)  # (1, max_len, d_model)
        
        # Register as buffer (not a parameter, but saved with model)
        self.register_buffer('pe', pe)
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Args:
            x: (batch_size, seq_len, d_model)
        Returns:
            x + positional encoding
        """
        x = x + self.pe[:, :x.size(1), :]
        return self.dropout(x)


class MultiHeadAttention(nn.Module):
    """
    Multi-head self-attention mechanism.
    """
    
    def __init__(self, d_model: int, num_heads: int, dropout: float = 0.1):
        super().__init__()
        assert d_model % num_heads == 0, "d_model must be divisible by num_heads"
        
        self.d_model = d_model
        self.num_heads = num_heads
        self.d_k = d_model // num_heads
        
        # Linear projections
        self.W_q = nn.Linear(d_model, d_model)
        self.W_k = nn.Linear(d_model, d_model)
        self.W_v = nn.Linear(d_model, d_model)
        self.W_o = nn.Linear(d_model, d_model)
        
        self.dropout = nn.Dropout(dropout)
        self.scale = math.sqrt(self.d_k)
    
    def forward(self, 
                query: torch.Tensor, 
                key: torch.Tensor, 
                value: torch.Tensor,
                mask: Optional[torch.Tensor] = None) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Args:
            query, key, value: (batch_size, seq_len, d_model)
            mask: (batch_size, seq_len) attention mask
            
        Returns:
            output: (batch_size, seq_len, d_model)
            attention_weights: (batch_size, num_heads, seq_len, seq_len)
        """
        batch_size = query.size(0)
        
        # Linear projections and reshape for multi-head
        Q = self.W_q(query).view(batch_size, -1, self.num_heads, self.d_k).transpose(1, 2)
        K = self.W_k(key).view(batch_size, -1, self.num_heads, self.d_k).transpose(1, 2)
        V = self.W_v(value).view(batch_size, -1, self.num_heads, self.d_k).transpose(1, 2)
        
        # Attention scores
        scores = torch.matmul(Q, K.transpose(-2, -1)) / self.scale
        
        # Apply mask
        if mask is not None:
            # Expand mask for num_heads
            mask = mask.unsqueeze(1).unsqueeze(2)  # (batch, 1, 1, seq_len)
            scores = scores.masked_fill(mask == 0, float('-inf'))
        
        # Softmax and dropout
        attention_weights = F.softmax(scores, dim=-1)
        attention_weights = self.dropout(attention_weights)
        
        # Apply attention to values
        context = torch.matmul(attention_weights, V)
        
        # Reshape and project
        context = context.transpose(1, 2).contiguous().view(batch_size, -1, self.d_model)
        output = self.W_o(context)
        
        return output, attention_weights


class FeedForward(nn.Module):
    """
    Position-wise feed-forward network.
    """
    
    def __init__(self, d_model: int, d_ff: int, dropout: float = 0.1):
        super().__init__()
        self.linear1 = nn.Linear(d_model, d_ff)
        self.linear2 = nn.Linear(d_ff, d_model)
        self.dropout = nn.Dropout(dropout)
        self.activation = nn.GELU()
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.linear2(self.dropout(self.activation(self.linear1(x))))


class TransformerEncoderLayer(nn.Module):
    """
    Single transformer encoder layer.
    """
    
    def __init__(self, d_model: int, num_heads: int, d_ff: int, dropout: float = 0.1):
        super().__init__()
        
        self.self_attention = MultiHeadAttention(d_model, num_heads, dropout)
        self.feed_forward = FeedForward(d_model, d_ff, dropout)
        
        self.norm1 = nn.LayerNorm(d_model)
        self.norm2 = nn.LayerNorm(d_model)
        
        self.dropout1 = nn.Dropout(dropout)
        self.dropout2 = nn.Dropout(dropout)
    
    def forward(self, 
                x: torch.Tensor, 
                mask: Optional[torch.Tensor] = None) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Args:
            x: (batch_size, seq_len, d_model)
            mask: (batch_size, seq_len)
            
        Returns:
            output: (batch_size, seq_len, d_model)
            attention_weights: (batch_size, num_heads, seq_len, seq_len)
        """
        # Self-attention with residual
        attn_out, attn_weights = self.self_attention(x, x, x, mask)
        x = self.norm1(x + self.dropout1(attn_out))
        
        # Feed-forward with residual
        ff_out = self.feed_forward(x)
        x = self.norm2(x + self.dropout2(ff_out))
        
        return x, attn_weights


class TransformerEncoder(nn.Module):
    """
    Stack of transformer encoder layers.
    """
    
    def __init__(self, 
                 num_layers: int,
                 d_model: int,
                 num_heads: int,
                 d_ff: int,
                 dropout: float = 0.1):
        super().__init__()
        
        self.layers = nn.ModuleList([
            TransformerEncoderLayer(d_model, num_heads, d_ff, dropout)
            for _ in range(num_layers)
        ])
    
    def forward(self, 
                x: torch.Tensor, 
                mask: Optional[torch.Tensor] = None) -> Tuple[torch.Tensor, list]:
        """
        Args:
            x: (batch_size, seq_len, d_model)
            mask: (batch_size, seq_len)
            
        Returns:
            output: (batch_size, seq_len, d_model)
            all_attention_weights: list of attention weights from each layer
        """
        all_attention_weights = []
        
        for layer in self.layers:
            x, attn_weights = layer(x, mask)
            all_attention_weights.append(attn_weights)
        
        return x, all_attention_weights


class IntentClassifier(nn.Module):
    """
    Complete intent classification model.
    
    Architecture:
    1. Token embedding
    2. Positional encoding
    3. Transformer encoder
    4. Pooling (mean or CLS token)
    5. Classification head
    """
    
    def __init__(self,
                 vocab_size: int = MODEL_CONFIG.vocab_size,
                 embedding_dim: int = MODEL_CONFIG.embedding_dim,
                 num_layers: int = MODEL_CONFIG.num_layers,
                 num_heads: int = MODEL_CONFIG.num_heads,
                 hidden_dim: int = MODEL_CONFIG.hidden_dim,
                 num_intents: int = MODEL_CONFIG.num_intents,
                 max_seq_length: int = MODEL_CONFIG.max_seq_length,
                 dropout: float = MODEL_CONFIG.dropout,
                 pad_token_id: int = 0):
        super().__init__()
        
        self.vocab_size = vocab_size
        self.embedding_dim = embedding_dim
        self.num_intents = num_intents
        self.pad_token_id = pad_token_id
        
        # Embedding layers
        self.token_embedding = nn.Embedding(vocab_size, embedding_dim, padding_idx=pad_token_id)
        self.positional_encoding = PositionalEncoding(embedding_dim, max_seq_length, dropout)
        
        # Transformer encoder
        self.encoder = TransformerEncoder(
            num_layers=num_layers,
            d_model=embedding_dim,
            num_heads=num_heads,
            d_ff=hidden_dim,
            dropout=dropout
        )
        
        # Classification head
        self.classifier = nn.Sequential(
            nn.Linear(embedding_dim, hidden_dim),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim // 2, num_intents)
        )
        
        # Initialize weights
        self._init_weights()
    
    def _init_weights(self):
        """Initialize model weights"""
        for module in self.modules():
            if isinstance(module, nn.Linear):
                nn.init.xavier_uniform_(module.weight)
                if module.bias is not None:
                    nn.init.zeros_(module.bias)
            elif isinstance(module, nn.Embedding):
                nn.init.normal_(module.weight, mean=0, std=0.02)
                if module.padding_idx is not None:
                    nn.init.zeros_(module.weight[module.padding_idx])
            elif isinstance(module, nn.LayerNorm):
                nn.init.ones_(module.weight)
                nn.init.zeros_(module.bias)
    
    def forward(self,
                input_ids: torch.Tensor,
                attention_mask: Optional[torch.Tensor] = None,
                return_attention: bool = False) -> Dict[str, torch.Tensor]:
        """
        Forward pass.
        
        Args:
            input_ids: (batch_size, seq_len) token IDs
            attention_mask: (batch_size, seq_len) 1 for real tokens, 0 for padding
            return_attention: whether to return attention weights
            
        Returns:
            Dictionary containing:
            - logits: (batch_size, num_intents) classification logits
            - probabilities: (batch_size, num_intents) softmax probabilities
            - attention_weights: (optional) attention weights from all layers
        """
        # Create attention mask if not provided
        if attention_mask is None:
            attention_mask = (input_ids != self.pad_token_id).float()
        
        # Embedding
        x = self.token_embedding(input_ids)
        x = self.positional_encoding(x)
        
        # Transformer encoding
        encoded, attention_weights = self.encoder(x, attention_mask)
        
        # Pool: use mean of non-padded tokens
        # Expand mask for broadcasting
        mask_expanded = attention_mask.unsqueeze(-1).expand(encoded.size())
        sum_embeddings = torch.sum(encoded * mask_expanded, dim=1)
        sum_mask = torch.clamp(attention_mask.sum(dim=1, keepdim=True), min=1e-9)
        pooled = sum_embeddings / sum_mask
        
        # Classification
        logits = self.classifier(pooled)
        probabilities = F.softmax(logits, dim=-1)
        
        output = {
            'logits': logits,
            'probabilities': probabilities,
            'pooled_output': pooled,
        }
        
        if return_attention:
            output['attention_weights'] = attention_weights
        
        return output
    
    def predict(self, 
                input_ids: torch.Tensor,
                attention_mask: Optional[torch.Tensor] = None,
                top_k: int = 3) -> Dict[str, torch.Tensor]:
        """
        Get predictions with confidence scores.
        
        Returns:
            Dictionary containing:
            - predicted_intent: (batch_size,) predicted intent index
            - confidence: (batch_size,) confidence score
            - top_k_intents: (batch_size, k) top-k intent indices
            - top_k_scores: (batch_size, k) top-k scores
        """
        self.eval()
        with torch.no_grad():
            output = self.forward(input_ids, attention_mask)
            probs = output['probabilities']
            
            # Top-k predictions
            top_k_scores, top_k_intents = torch.topk(probs, k=min(top_k, self.num_intents), dim=-1)
            
            return {
                'predicted_intent': top_k_intents[:, 0],
                'confidence': top_k_scores[:, 0],
                'top_k_intents': top_k_intents,
                'top_k_scores': top_k_scores,
            }
    
    def count_parameters(self) -> int:
        """Count trainable parameters"""
        return sum(p.numel() for p in self.parameters() if p.requires_grad)
    
    @classmethod
    def from_config(cls, config: Dict) -> 'IntentClassifier':
        """Create model from config dictionary"""
        return cls(
            vocab_size=config.get('vocab_size', MODEL_CONFIG.vocab_size),
            embedding_dim=config.get('embedding_dim', MODEL_CONFIG.embedding_dim),
            num_layers=config.get('num_layers', MODEL_CONFIG.num_layers),
            num_heads=config.get('num_heads', MODEL_CONFIG.num_heads),
            hidden_dim=config.get('hidden_dim', MODEL_CONFIG.hidden_dim),
            num_intents=config.get('num_intents', MODEL_CONFIG.num_intents),
            max_seq_length=config.get('max_seq_length', MODEL_CONFIG.max_seq_length),
            dropout=config.get('dropout', MODEL_CONFIG.dropout),
        )


def create_model(num_intents: int, vocab_size: int) -> IntentClassifier:
    """Factory function to create model with correct dimensions"""
    model = IntentClassifier(
        vocab_size=vocab_size,
        embedding_dim=MODEL_CONFIG.embedding_dim,
        num_layers=MODEL_CONFIG.num_layers,
        num_heads=MODEL_CONFIG.num_heads,
        hidden_dim=MODEL_CONFIG.hidden_dim,
        num_intents=num_intents,
        max_seq_length=MODEL_CONFIG.max_seq_length,
        dropout=MODEL_CONFIG.dropout,
    )
    
    print(f"Model created with {model.count_parameters():,} parameters")
    return model


def main():
    """Test model architecture"""
    print("=" * 60)
    print("Testing Intent Classifier Model")
    print("=" * 60)
    
    # Create model
    model = IntentClassifier(
        vocab_size=5000,
        num_intents=45,
    )
    
    print(f"\nModel Architecture:")
    print(model)
    
    print(f"\nTotal Parameters: {model.count_parameters():,}")
    
    # Test forward pass
    batch_size = 4
    seq_len = 32
    
    input_ids = torch.randint(0, 5000, (batch_size, seq_len))
    attention_mask = torch.ones(batch_size, seq_len)
    attention_mask[:, -5:] = 0  # Simulate padding
    
    print(f"\nInput shape: {input_ids.shape}")
    
    output = model(input_ids, attention_mask, return_attention=True)
    
    print(f"Logits shape: {output['logits'].shape}")
    print(f"Probabilities shape: {output['probabilities'].shape}")
    print(f"Pooled output shape: {output['pooled_output'].shape}")
    
    # Test prediction
    predictions = model.predict(input_ids, attention_mask)
    print(f"\nPredicted intents: {predictions['predicted_intent']}")
    print(f"Confidence scores: {predictions['confidence']}")
    print(f"Top-3 intents: {predictions['top_k_intents']}")


if __name__ == '__main__':
    main()

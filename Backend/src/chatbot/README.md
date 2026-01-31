# IT Help Desk Neural Network Chatbot

## 1. Problem Definition

### Scope & Limitations

**What the chatbot handles:**
- 🔐 **Account & Access**: Password resets, login issues, MFA setup, account unlock
- 🌐 **Network Issues**: VPN, WiFi, connectivity, firewall problems
- 💻 **Software Support**: Office 365, email, browser issues, software installation
- 🖥️ **Hardware Problems**: Printers, monitors, keyboards, laptops
- 👥 **HR Systems**: Leave requests, payroll questions, benefits
- 🛡️ **Security**: Phishing reports, virus alerts, security policies

**Limitations:**
- Cannot perform actual system changes (only provides instructions)
- Cannot access external systems or databases in real-time
- Limited to predefined intent categories
- Requires human escalation for complex/unique issues

### Expected Response Style
- **Concise**: Direct answers without unnecessary fluff
- **Step-by-step**: Numbered instructions for procedures
- **Technical**: Appropriate technical detail for IT support

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    IT Help Desk Chatbot                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User Query: "My VPN keeps disconnecting"                       │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────────┐                                           │
│  │   Tokenizer     │  Convert text → token IDs                 │
│  │   (BPE/WordPiece)│                                          │
│  └────────┬────────┘                                           │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐                                           │
│  │   Embedding     │  Token IDs → Dense vectors (128-dim)      │
│  │   Layer         │                                           │
│  └────────┬────────┘                                           │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐                                           │
│  │   Transformer   │  4 layers, 4 heads, 256 hidden           │
│  │   Encoder       │  ~2M parameters                           │
│  └────────┬────────┘                                           │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐                                           │
│  │   Intent        │  Classify into 45 intent categories      │
│  │   Classifier    │  Softmax output                           │
│  └────────┬────────┘                                           │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐                                           │
│  │   Response      │  Select response from intent              │
│  │   Generator     │  + Entity extraction                      │
│  └────────┬────────┘                                           │
│           │                                                     │
│           ▼                                                     │
│  Response: "VPN Troubleshooting Guide: 1. Verify..."           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Model Specifications

### Small Transformer Architecture

| Component | Specification |
|-----------|---------------|
| **Embedding Dimension** | 128 |
| **Hidden Dimension** | 256 |
| **Number of Layers** | 4 |
| **Attention Heads** | 4 |
| **Max Sequence Length** | 128 tokens |
| **Vocabulary Size** | ~5000 tokens |
| **Total Parameters** | ~2-3M |
| **Model Size** | ~10-15MB |

### Why This Architecture?

1. **Small & Fast**: Runs efficiently on CPU, ~50ms inference
2. **Sufficient for Classification**: Intent classification doesn't need GPT-4 scale
3. **Easy to Train**: Can train on a single GPU in < 1 hour
4. **Portable**: Can deploy on edge devices or serverless

---

## 4. Training Data

### Dataset Sources
- `knowledge-data.json`: 45 intents, ~650 patterns
- `Intent.json`: Greeting/conversation intents, ~200 patterns

### Data Split
- **Training**: 80% (~680 samples)
- **Validation**: 10% (~85 samples)
- **Test**: 10% (~85 samples)

---

## 5. File Structure

```
Backend/src/chatbot/
├── README.md                    # This file
├── knowledge-data.json          # Main IT support intents
├── Intent.json                  # Greeting/conversation intents
├── config.py                    # Model configuration
├── preprocess.py                # Data preprocessing
├── tokenizer.py                 # Custom BPE tokenizer
├── model.py                     # Transformer model architecture
├── train.py                     # Training script
├── evaluate.py                  # Evaluation metrics
├── inference.py                 # Inference/chat interface
├── data/
│   ├── train.json              # Processed training data
│   ├── valid.json              # Validation data
│   └── test.json               # Test data
├── models/
│   ├── tokenizer.json          # Trained tokenizer
│   └── helpdesk_model.pt       # Trained model weights
└── logs/
    └── training.log            # Training logs
```

---

## 6. Quick Start

```bash
# 1. Install dependencies
pip install torch numpy scikit-learn tqdm

# 2. Preprocess data
python preprocess.py

# 3. Train model
python train.py

# 4. Evaluate
python evaluate.py

# 5. Run inference
python inference.py
```

---

## 7. Hardware Requirements

### Minimum (CPU Training)
- 8GB RAM
- 4-core CPU
- Training time: ~2-4 hours

### Recommended (GPU Training)
- 16GB RAM
- NVIDIA GPU with 4GB+ VRAM
- Training time: ~15-30 minutes

---

## 8. Metrics & Evaluation

| Metric | Target | Description |
|--------|--------|-------------|
| **Intent Accuracy** | >90% | Correct intent classification |
| **Top-3 Accuracy** | >98% | Correct intent in top 3 predictions |
| **Response Relevance** | >85% | Human-judged relevance score |
| **Confidence Calibration** | Low ECE | Predicted confidence matches accuracy |
| **Inference Latency** | <100ms | Time to generate response |

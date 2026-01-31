# Ticket Classifier - Neural Network Auto-Assignment

A neural network-based ticket classification system that automatically assigns support tickets to the appropriate agents based on ticket type and priority.

## Overview

This system uses a feedforward neural network with sigmoid activation to classify incoming tickets and route them to specialized agents:

| Agent | ID | Specialization |
|-------|-----|----------------|
| Agent 1 | 692479b918668dee67209282 | Software |
| Agent 2 | 692a056cfad7d194cd3f0992 | Hardware |
| Agent 3 | 69438f79c1af7ec03ff7fed0 | Network |

## Architecture

### Neural Network
- **Input Layer**: 2 neurons (priority, type - encoded as normalized values)
- **Hidden Layer 1**: 16 neurons with sigmoid activation
- **Hidden Layer 2**: 8 neurons with sigmoid activation
- **Output Layer**: 3 neurons with softmax activation (one per agent)

### Training Data
- **Dataset**: 50,000 samples
- **Features**: Priority (low/medium/high), Type (software/hardware/network)
- **Labels**: Agent assignment (Agent 1/2/3)
- **Train/Test Split**: 80/20

### Performance
- Training Accuracy: ~75.5%
- Test Accuracy: ~75.9%
- Confidence levels: 70-85% typical

## Files

| File | Description |
|------|-------------|
| `neural_network.py` | Core neural network implementation |
| `classifier.py` | Main classifier class with routing logic |
| `train_model.py` | Training script for the neural network |
| `classify.py` | CLI tool for direct classification |
| `api.py` | REST API server (optional) |
| `config.py` | Configuration and constants |
| `verify_model.py` | Model verification utility |
| `requirements.txt` | Python dependencies |

## Installation

```bash
# Navigate to classifier directory
cd Backend/src/tickets/classifier

# Install dependencies
pip install -r requirements.txt

# Train the model (uses train.csv from parent directory)
python train_model.py
```

## Usage

### Command Line

```bash
# Classify a single ticket
python classify.py <priority> <type>

# Examples
python classify.py high software
python classify.py medium hardware
python classify.py low network
```

### Python API

```python
from classifier import TicketClassifier

# Initialize classifier (loads model automatically)
classifier = TicketClassifier()

# Classify a ticket
result = classifier.classify_ticket('high', 'software')
print(result)
# {
#   'priority': 'high',
#   'type': 'software',
#   'predicted_agent': 'Agent 1',
#   'predicted_agent_id': '692479b918668dee67209282',
#   'confidence': 0.826,
#   'probabilities': {'Agent 1': 0.826, 'Agent 2': 0.105, 'Agent 3': 0.069},
#   'specialization': 'software'
# }

# Create and route a ticket with queue management
result = classifier.create_ticket('TKT-001', 'high', 'software')
```

### REST API (Optional)

```bash
# Start API server
python api.py --port 5000

# Endpoints
GET  /health         - Health check
GET  /status         - System status
GET  /classify       - Classify ticket (query params)
POST /classify       - Classify ticket (JSON body)
POST /ticket         - Create and route ticket
POST /ticket/close   - Close a ticket
```

## Routing Algorithm

The system implements a sophisticated routing algorithm:

1. **Primary Assignment**: Based on ticket type specialization
   - Software → Agent 1
   - Hardware → Agent 2
   - Network → Agent 3

2. **Secondary Assignment**: When primary agent is at capacity
   - Agent 1 also handles: Medium Network, Low Hardware
   - Agent 2 also handles: Medium Software, Low Network
   - Agent 3 also handles: Medium Hardware, Low Software

3. **Queue Management**: 
   - High-priority tickets wait for specialist
   - Medium/Low priority can be reassigned
   - Max 5 concurrent tickets per agent (configurable)

4. **FCFS Queues**: Three priority queues
   - High priority (processed first)
   - Medium priority
   - Low priority

## Integration with NestJS

The classifier integrates with the NestJS backend via `TicketClassifierService`:

```typescript
// In tickets.service.ts
const { agentType, agentId, confidence } = await this.assignAgentUsingNN(
  createTicketDto.type,
  priority,
);
```

When a ticket is created:
1. Neural network classifies the ticket
2. Returns predicted agent with confidence score
3. Ticket is auto-assigned to the predicted agent
4. ML metadata is stored with the ticket for analytics

## Retraining the Model

To retrain with new data:

1. Update `train.csv` with new samples
2. Run: `python train_model.py`
3. Model is saved to `ticket_classifier_model.joblib`

The model will automatically be used on next NestJS restart.

## Configuration

Edit `config.py` to modify:
- Agent IDs and specializations
- Maximum tickets per agent (default: 5)
- Priority levels and types
- Feature encoding schemes

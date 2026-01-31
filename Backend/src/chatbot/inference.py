"""
Inference Module for IT Help Desk Chatbot

Features:
- Real-time intent classification
- Response selection from knowledge base
- Confidence thresholding with fallback
- Conversation history (optional)
- REST API integration ready
"""

import json
import os
import random
from typing import Dict, List, Optional, Tuple
from datetime import datetime

import torch

from config import (
    MODEL_CONFIG, DATA_CONFIG, INFERENCE_CONFIG,
    MODEL_DIR, DATA_DIR, BASE_DIR
)
from model import IntentClassifier
from tokenizer import SimpleTokenizer


class ChatBot:
    """IT Help Desk Chatbot for inference"""
    
    def __init__(self, 
                 model: IntentClassifier,
                 tokenizer: SimpleTokenizer,
                 intent_map: Dict,
                 responses: Dict,
                 device: str = None):
        """
        Initialize chatbot.
        
        Args:
            model: Trained IntentClassifier
            tokenizer: Tokenizer for text encoding
            intent_map: Intent to index mapping
            responses: Intent to responses mapping
            device: Device to run inference on
        """
        self.model = model
        self.tokenizer = tokenizer
        self.intent_map = intent_map
        self.responses = responses
        self.idx_to_intent = {v: k for k, v in intent_map['intent_to_idx'].items()}
        self.device = device or ('cuda' if torch.cuda.is_available() else 'cpu')
        
        self.model.to(self.device)
        self.model.eval()
        
        # Conversation history
        self.conversation_history: List[Dict] = []
        
        # Escalation keywords - only truly urgent ones
        self.escalation_keywords = [
            'urgent', 'emergency', 'critical', 'production issue',
            'system down', 'completely broken', 'nothing works',
            'asap', 'immediately', 'right now'
        ]
        
        # Fallback responses
        self.fallback_responses = [
            "I'm not quite sure I understand. Could you please rephrase your question?",
            "I'd like to help, but I need more details. Can you describe your issue?",
            "I'm having trouble understanding. Could you try asking in a different way?",
            "Let me connect you with a human agent who can better assist you.",
            "I apologize, but I'm not sure how to help with that. Let me escalate this to our support team."
        ]
        
        print(f"✅ ChatBot initialized on {self.device}")
        print(f"  Available intents: {len(self.idx_to_intent)}")
    
    @torch.no_grad()
    def predict(self, text: str, top_k: int = 3) -> Dict:
        """
        Predict intent for a given text.
        
        Args:
            text: User input text
            top_k: Number of top predictions to return
            
        Returns:
            Dictionary with predictions and metadata
        """
        # Encode text
        encoded = self.tokenizer.encode(
            text,
            max_length=MODEL_CONFIG.max_seq_length,
            padding=True,
            truncation=True
        )
        
        input_ids = torch.tensor([encoded['input_ids']], device=self.device)
        attention_mask = torch.tensor([encoded['attention_mask']], device=self.device)
        
        # Get model output
        output = self.model(input_ids, attention_mask)
        probs = output['probabilities'][0]
        
        # Get top-k predictions
        top_k_probs, top_k_indices = probs.topk(top_k)
        
        predictions = []
        for prob, idx in zip(top_k_probs.tolist(), top_k_indices.tolist()):
            intent = self.idx_to_intent.get(idx, f'unknown_{idx}')
            predictions.append({
                'intent': intent,
                'confidence': prob,
                'index': idx
            })
        
        return {
            'input': text,
            'predictions': predictions,
            'top_intent': predictions[0]['intent'],
            'top_confidence': predictions[0]['confidence'],
            'tokens': encoded['tokens'] if 'tokens' in encoded else None
        }
    
    def get_response(self, intent: str) -> str:
        """Get a response for the given intent"""
        if intent in self.responses:
            responses = self.responses[intent]
            return random.choice(responses) if isinstance(responses, list) else responses
        return random.choice(self.fallback_responses)
    
    def check_escalation(self, text: str, confidence: float, intent: str) -> Tuple[bool, str]:
        """Check if the query should be escalated to human support"""
        text_lower = text.lower()
        
        # Check if the intent itself is marked for escalation (like 'frustrated')
        if intent == 'frustrated':
            return True, "escalation_frustrated"
        
        # Only check keywords if confidence is moderate (not very high)
        if confidence < 0.8:
            for keyword in self.escalation_keywords:
                if keyword in text_lower:
                    return True, "escalation_urgent"
        
        # Check confidence threshold - only escalate if very low confidence
        if confidence < INFERENCE_CONFIG.escalation_threshold:
            return True, "escalation_low_confidence"
        
        return False, None
    
    def chat(self, user_input: str) -> Dict:
        """
        Main chat function - process user input and return response.
        
        Args:
            user_input: User's message
            
        Returns:
            Dictionary with response and metadata
        """
        timestamp = datetime.now().isoformat()
        
        # Clean input
        user_input = user_input.strip()
        if not user_input:
            return {
                'response': "I didn't catch that. Could you please type your question?",
                'intent': None,
                'confidence': 0,
                'escalate': False,
                'timestamp': timestamp
            }
        
        # Get prediction
        prediction = self.predict(user_input, top_k=3)
        intent = prediction['top_intent']
        confidence = prediction['top_confidence']
        
        # Check for escalation (pass intent for frustrated check)
        escalate, escalation_reason = self.check_escalation(user_input, confidence, intent)
        
        # Get response
        if confidence < INFERENCE_CONFIG.confidence_threshold:
            # Low confidence - use fallback
            response = random.choice(self.fallback_responses)
            intent = 'fallback'
        elif escalate:
            response = (
                "I understand this is important to you. "
                "Let me connect you with a human support agent who can better assist. "
                "Please hold on while I transfer you."
            )
        else:
            response = self.get_response(intent)
        
        # Build result
        result = {
            'response': response,
            'intent': intent,
            'confidence': confidence,
            'top_predictions': prediction['predictions'][:3],
            'escalate': escalate,
            'escalation_reason': escalation_reason,
            'timestamp': timestamp
        }
        
        # Add to conversation history
        self.conversation_history.append({
            'role': 'user',
            'content': user_input,
            'timestamp': timestamp
        })
        self.conversation_history.append({
            'role': 'assistant',
            'content': response,
            'intent': intent,
            'confidence': confidence,
            'timestamp': timestamp
        })
        
        return result
    
    def clear_history(self):
        """Clear conversation history"""
        self.conversation_history = []
    
    def get_history(self) -> List[Dict]:
        """Get conversation history"""
        return self.conversation_history


def load_responses() -> Dict[str, List[str]]:
    """Load responses from knowledge data"""
    responses = {}
    
    # Load main knowledge base (in chatbot root directory)
    kb_path = os.path.join(BASE_DIR, 'knowledge-data.json')
    if os.path.exists(kb_path):
        with open(kb_path, 'r') as f:
            data = json.load(f)
        
        for intent_data in data.get('intents', []):
            tag = intent_data.get('tag')
            intent_responses = intent_data.get('responses', [])
            if tag and intent_responses:
                responses[tag] = intent_responses
    
    # Load greeting intents (also in chatbot root directory)
    intent_path = os.path.join(BASE_DIR, 'Intent.json')
    if os.path.exists(intent_path):
        with open(intent_path, 'r') as f:
            data = json.load(f)
        
        for intent_data in data.get('intents', []):
            tag = intent_data.get('tag')
            intent_responses = intent_data.get('responses', [])
            if tag and intent_responses:
                responses[tag] = intent_responses
    
    return responses


def load_chatbot() -> ChatBot:
    """Load trained chatbot"""
    # Load intent map
    with open(DATA_CONFIG.intent_map_path, 'r') as f:
        intent_map = json.load(f)
    
    # Load tokenizer
    tokenizer = SimpleTokenizer.load(MODEL_CONFIG.tokenizer_path)
    
    # Load model
    model_path = os.path.join(MODEL_DIR, 'best_model.pt')
    if not os.path.exists(model_path):
        model_path = os.path.join(MODEL_DIR, 'final_model.pt')
    
    if not os.path.exists(model_path):
        raise FileNotFoundError(
            f"No trained model found at {model_path}. "
            "Please run train.py first."
        )
    
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
    
    # Load responses
    responses = load_responses()
    
    return ChatBot(
        model=model,
        tokenizer=tokenizer,
        intent_map=intent_map,
        responses=responses
    )


class ChatBotAPI:
    """API wrapper for ChatBot - ready for NestJS integration"""
    
    def __init__(self):
        self._chatbot: Optional[ChatBot] = None
    
    @property
    def chatbot(self) -> ChatBot:
        """Lazy loading of chatbot"""
        if self._chatbot is None:
            self._chatbot = load_chatbot()
        return self._chatbot
    
    def process_message(self, message: str, session_id: str = None) -> Dict:
        """
        Process a message and return response.
        
        This is the main entry point for API integration.
        """
        result = self.chatbot.chat(message)
        
        return {
            'success': True,
            'data': {
                'message': result['response'],
                'intent': result['intent'],
                'confidence': result['confidence'],
                'predictions': result['top_predictions'],
                'requires_escalation': result['escalate'],
                'timestamp': result['timestamp']
            },
            'session_id': session_id
        }
    
    def get_prediction_only(self, message: str) -> Dict:
        """Get prediction without generating response"""
        prediction = self.chatbot.predict(message, top_k=5)
        
        return {
            'success': True,
            'data': {
                'intent': prediction['top_intent'],
                'confidence': prediction['top_confidence'],
                'predictions': prediction['predictions']
            }
        }


# Interactive chat for testing
def interactive_chat():
    """Run interactive chat session"""
    print("=" * 60)
    print("IT Help Desk Chatbot - Interactive Mode")
    print("=" * 60)
    print("\nLoading chatbot...")
    
    try:
        chatbot = load_chatbot()
    except FileNotFoundError as e:
        print(f"\n❌ Error: {e}")
        print("Please run the training pipeline first:")
        print("  1. python preprocess.py")
        print("  2. python train.py")
        return
    
    print("\n✅ Chatbot ready!")
    print("-" * 60)
    print("Commands:")
    print("  'quit' or 'exit' - Exit the chat")
    print("  'history' - Show conversation history")
    print("  'clear' - Clear conversation history")
    print("  'debug' - Toggle debug mode")
    print("-" * 60)
    
    debug_mode = False
    
    while True:
        try:
            user_input = input("\n📝 You: ").strip()
            
            if not user_input:
                continue
            
            # Handle commands
            if user_input.lower() in ['quit', 'exit', 'q']:
                print("\n👋 Goodbye!")
                break
            
            if user_input.lower() == 'history':
                history = chatbot.get_history()
                print("\n📜 Conversation History:")
                for msg in history[-10:]:  # Last 10 messages
                    role = "You" if msg['role'] == 'user' else "Bot"
                    print(f"  {role}: {msg['content'][:100]}...")
                continue
            
            if user_input.lower() == 'clear':
                chatbot.clear_history()
                print("✅ History cleared")
                continue
            
            if user_input.lower() == 'debug':
                debug_mode = not debug_mode
                print(f"🔧 Debug mode: {'ON' if debug_mode else 'OFF'}")
                continue
            
            # Get response
            result = chatbot.chat(user_input)
            
            # Print response
            print(f"\n🤖 Bot: {result['response']}")
            
            # Debug info
            if debug_mode:
                print(f"\n  [Debug]")
                print(f"  Intent: {result['intent']}")
                print(f"  Confidence: {result['confidence']:.4f}")
                print(f"  Top predictions:")
                for i, pred in enumerate(result['top_predictions'], 1):
                    print(f"    {i}. {pred['intent']} ({pred['confidence']:.4f})")
                if result['escalate']:
                    print(f"  ⚠️ Escalation: {result['escalation_reason']}")
        
        except KeyboardInterrupt:
            print("\n\n👋 Goodbye!")
            break
        except Exception as e:
            print(f"\n❌ Error: {e}")


def benchmark():
    """Run quick benchmark"""
    print("Running benchmark...")
    
    try:
        chatbot = load_chatbot()
    except FileNotFoundError as e:
        print(f"Error: {e}")
        return
    
    test_queries = [
        "I forgot my password",
        "How do I reset my password?",
        "VPN is not connecting",
        "My computer is slow",
        "How do I request time off?",
        "I need access to the shared drive",
        "Hello",
        "Thank you for your help",
        "This is urgent, my system is down!",
        "How do I set up two-factor authentication?"
    ]
    
    import time
    
    total_time = 0
    print("\nBenchmark Results:")
    print("-" * 70)
    
    for query in test_queries:
        start = time.time()
        result = chatbot.chat(query)
        elapsed = (time.time() - start) * 1000
        total_time += elapsed
        
        print(f"Query: \"{query[:40]}...\"")
        print(f"  Intent: {result['intent']} ({result['confidence']:.4f})")
        print(f"  Time: {elapsed:.2f}ms")
        print()
    
    print("-" * 70)
    print(f"Average latency: {total_time / len(test_queries):.2f}ms")


if __name__ == '__main__':
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == '--benchmark':
        benchmark()
    else:
        interactive_chat()

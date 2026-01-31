"""
Flask API Server for IT Help Desk Chatbot

Provides REST endpoints for the NestJS backend to integrate with.
Run this as a microservice alongside the NestJS server.
"""

import os
import sys
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from inference import load_chatbot, ChatBot

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Global chatbot instance (lazy loaded)
_chatbot: ChatBot = None


def get_chatbot() -> ChatBot:
    """Get or initialize chatbot"""
    global _chatbot
    if _chatbot is None:
        print("🤖 Loading chatbot model...")
        _chatbot = load_chatbot()
        print("✅ Chatbot loaded successfully!")
    return _chatbot


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'chatbot-api',
        'timestamp': datetime.now().isoformat()
    })


@app.route('/api/chatbot/message', methods=['POST'])
def process_message():
    """
    Process a chat message and return AI response.
    
    Request body:
    {
        "message": "How do I reset my password?",
        "sessionId": "optional-session-id",
        "userId": "optional-user-id"
    }
    
    Response:
    {
        "success": true,
        "data": {
            "message": "To reset your password...",
            "intent": "password_reset",
            "confidence": 0.95,
            "predictions": [...],
            "requiresEscalation": false
        }
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'message' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing required field: message'
            }), 400
        
        message = data['message'].strip()
        session_id = data.get('sessionId')
        user_id = data.get('userId')
        
        if not message:
            return jsonify({
                'success': False,
                'error': 'Message cannot be empty'
            }), 400
        
        # Get chatbot response
        chatbot = get_chatbot()
        result = chatbot.chat(message)
        
        return jsonify({
            'success': True,
            'data': {
                'message': result['response'],
                'intent': result['intent'],
                'confidence': round(result['confidence'], 4),
                'predictions': [
                    {
                        'intent': p['intent'],
                        'confidence': round(p['confidence'], 4)
                    }
                    for p in result.get('top_predictions', [])[:3]
                ],
                'requiresEscalation': result.get('escalate', False),
                'escalationReason': result.get('escalation_reason'),
                'timestamp': result['timestamp']
            },
            'sessionId': session_id,
            'userId': user_id
        })
        
    except Exception as e:
        print(f"❌ Error processing message: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/chatbot/predict', methods=['POST'])
def predict_intent():
    """
    Get intent prediction without generating a response.
    Useful for ticket classification.
    
    Request body:
    {
        "message": "My laptop won't turn on"
    }
    
    Response:
    {
        "success": true,
        "data": {
            "intent": "laptop_issues",
            "confidence": 0.87,
            "predictions": [...]
        }
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'message' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing required field: message'
            }), 400
        
        message = data['message'].strip()
        
        if not message:
            return jsonify({
                'success': False,
                'error': 'Message cannot be empty'
            }), 400
        
        # Get prediction
        chatbot = get_chatbot()
        prediction = chatbot.predict(message, top_k=5)
        
        return jsonify({
            'success': True,
            'data': {
                'intent': prediction['top_intent'],
                'confidence': round(prediction['top_confidence'], 4),
                'predictions': [
                    {
                        'intent': p['intent'],
                        'confidence': round(p['confidence'], 4)
                    }
                    for p in prediction['predictions']
                ]
            }
        })
        
    except Exception as e:
        print(f"❌ Error predicting intent: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/chatbot/intents', methods=['GET'])
def get_intents():
    """Get list of available intents"""
    try:
        chatbot = get_chatbot()
        intents = list(chatbot.idx_to_intent.values())
        
        return jsonify({
            'success': True,
            'data': {
                'intents': intents,
                'count': len(intents)
            }
        })
        
    except Exception as e:
        print(f"❌ Error getting intents: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/chatbot/info', methods=['GET'])
def get_model_info():
    """Get information about the loaded model"""
    try:
        chatbot = get_chatbot()
        
        return jsonify({
            'success': True,
            'data': {
                'numIntents': len(chatbot.idx_to_intent),
                'vocabSize': chatbot.tokenizer.vocab_size,
                'device': chatbot.device,
                'confidenceThreshold': 0.25,
                'escalationThreshold': 0.3
            }
        })
        
    except Exception as e:
        print(f"❌ Error getting model info: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


def main():
    """Run the Flask server"""
    port = int(os.environ.get('CHATBOT_PORT', 5050))
    debug = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    
    print("=" * 60)
    print("🤖 IT Help Desk Chatbot API Server")
    print("=" * 60)
    print(f"  Port: {port}")
    print(f"  Debug: {debug}")
    print("=" * 60)
    
    # Pre-load the model
    get_chatbot()
    
    print(f"\n🚀 Server running at http://localhost:{port}")
    print("   Endpoints:")
    print(f"     POST /api/chatbot/message  - Chat with the bot")
    print(f"     POST /api/chatbot/predict  - Predict intent only")
    print(f"     GET  /api/chatbot/intents  - List all intents")
    print(f"     GET  /api/chatbot/info     - Model information")
    print(f"     GET  /health               - Health check")
    print("\n⚠️  Using Flask development server (not for production)")
    print("   For production, use: gunicorn -w 4 -b 0.0.0.0:5050 api_server:app")
    
    app.run(host='0.0.0.0', port=port, debug=debug)


if __name__ == '__main__':
    main()

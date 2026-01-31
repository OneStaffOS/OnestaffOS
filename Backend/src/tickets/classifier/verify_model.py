#!/usr/bin/env python3
"""
Verify that the model is loaded and working
"""
import os
import sys
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from classifier import TicketClassifier

def main():
    classifier = TicketClassifier()
    
    if classifier.model_loaded:
        # Test a prediction
        result = classifier.classify_ticket('high', 'software')
        print(json.dumps({
            'status': 'ok',
            'model_loaded': True,
            'test_prediction': result
        }))
    else:
        print(json.dumps({
            'status': 'error',
            'model_loaded': False,
            'message': 'Model not found. Run train_model.py first.'
        }))
        sys.exit(1)

if __name__ == '__main__':
    main()

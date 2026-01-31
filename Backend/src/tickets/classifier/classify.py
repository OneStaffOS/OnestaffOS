#!/usr/bin/env python3
"""
Classify a ticket using the trained neural network model.
Called directly by NestJS for ticket classification.

Usage: python classify.py <priority> <type>
Output: JSON with classification result
"""

import sys
import os
import json
import io

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Suppress stdout during import/initialization
_original_stdout = sys.stdout
sys.stdout = io.StringIO()

from classifier import TicketClassifier

# Restore stdout
sys.stdout = _original_stdout


def main():
    if len(sys.argv) != 3:
        print(json.dumps({
            'error': 'Usage: python classify.py <priority> <type>',
            'example': 'python classify.py high software'
        }))
        sys.exit(1)
    
    priority = sys.argv[1].lower()
    ticket_type = sys.argv[2].lower()
    
    # Validate inputs
    valid_priorities = ['low', 'medium', 'high']
    valid_types = ['software', 'hardware', 'network']
    
    if priority not in valid_priorities:
        print(json.dumps({
            'error': f'Invalid priority: {priority}',
            'valid_values': valid_priorities
        }))
        sys.exit(1)
    
    if ticket_type not in valid_types:
        print(json.dumps({
            'error': f'Invalid type: {ticket_type}',
            'valid_values': valid_types
        }))
        sys.exit(1)
    
    try:
        # Suppress stdout during classifier initialization
        sys.stdout = io.StringIO()
        classifier = TicketClassifier()
        sys.stdout = _original_stdout
        
        if not classifier.model_loaded:
            print(json.dumps({
                'error': 'Model not loaded',
                'message': 'Please run train_model.py first'
            }))
            sys.exit(1)
        
        result = classifier.classify_ticket(priority, ticket_type)
        print(json.dumps(result))
        
    except Exception as e:
        sys.stdout = _original_stdout
        print(json.dumps({
            'error': str(e)
        }))
        sys.exit(1)


if __name__ == '__main__':
    main()

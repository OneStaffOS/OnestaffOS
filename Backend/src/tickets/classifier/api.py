#!/usr/bin/env python3
"""
REST API for Ticket Classifier
Provides HTTP endpoints for ticket classification and routing
Can be run as a standalone service or imported
"""

import os
import sys
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from typing import Dict, Any

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from classifier import TicketClassifier
from config import AGENT_IDS, PRIORITY_LEVELS, TICKET_TYPES


# Global classifier instance
classifier = TicketClassifier()


class TicketClassifierHandler(BaseHTTPRequestHandler):
    """HTTP Request Handler for Ticket Classification API."""
    
    def _set_headers(self, status_code: int = 200, content_type: str = 'application/json'):
        """Set response headers."""
        self.send_response(status_code)
        self.send_header('Content-Type', content_type)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def _send_json(self, data: Dict[str, Any], status_code: int = 200):
        """Send JSON response."""
        self._set_headers(status_code)
        self.wfile.write(json.dumps(data, indent=2).encode())
    
    def _send_error(self, message: str, status_code: int = 400):
        """Send error response."""
        self._send_json({'error': message}, status_code)
    
    def do_OPTIONS(self):
        """Handle CORS preflight."""
        self._set_headers(200)
    
    def do_GET(self):
        """Handle GET requests."""
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)
        
        if path == '/health':
            self._send_json({
                'status': 'healthy',
                'model_loaded': classifier.model_loaded,
            })
        
        elif path == '/status':
            self._send_json(classifier.get_status())
        
        elif path == '/agents':
            self._send_json({
                'agents': AGENT_IDS,
                'available': classifier.get_available_agents(),
            })
        
        elif path == '/classify':
            # GET /classify?priority=high&type=software
            priority = query.get('priority', [None])[0]
            ticket_type = query.get('type', [None])[0]
            
            if not priority or not ticket_type:
                self._send_error('Missing priority or type parameter')
                return
            
            try:
                result = classifier.classify_ticket(priority, ticket_type)
                self._send_json(result)
            except Exception as e:
                self._send_error(str(e), 500)
        
        else:
            self._send_error('Not found', 404)
    
    def do_POST(self):
        """Handle POST requests."""
        parsed = urlparse(self.path)
        path = parsed.path
        
        # Read request body
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode() if content_length > 0 else '{}'
        
        try:
            data = json.loads(body) if body else {}
        except json.JSONDecodeError:
            self._send_error('Invalid JSON')
            return
        
        if path == '/classify':
            # POST /classify with JSON body
            priority = data.get('priority')
            ticket_type = data.get('type')
            
            if not priority or not ticket_type:
                self._send_error('Missing priority or type in request body')
                return
            
            try:
                result = classifier.classify_ticket(priority, ticket_type)
                self._send_json(result)
            except Exception as e:
                self._send_error(str(e), 500)
        
        elif path == '/ticket':
            # POST /ticket - Create and route a ticket
            ticket_id = data.get('ticket_id')
            priority = data.get('priority')
            ticket_type = data.get('type')
            
            if not all([ticket_id, priority, ticket_type]):
                self._send_error('Missing ticket_id, priority, or type')
                return
            
            try:
                result = classifier.create_ticket(ticket_id, priority, ticket_type)
                self._send_json(result)
            except Exception as e:
                self._send_error(str(e), 500)
        
        elif path == '/ticket/close':
            # POST /ticket/close - Close a ticket
            ticket_id = data.get('ticket_id')
            
            if not ticket_id:
                self._send_error('Missing ticket_id')
                return
            
            try:
                result = classifier.close_ticket(ticket_id)
                self._send_json(result)
            except Exception as e:
                self._send_error(str(e), 500)
        
        elif path == '/reset':
            # POST /reset - Reset the classifier state
            global classifier
            classifier = TicketClassifier()
            self._send_json({'message': 'Classifier reset successfully'})
        
        else:
            self._send_error('Not found', 404)
    
    def log_message(self, format, *args):
        """Custom logging."""
        print(f"[API] {self.address_string()} - {format % args}")


def run_server(port: int = 5000):
    """Run the HTTP server."""
    server_address = ('', port)
    httpd = HTTPServer(server_address, TicketClassifierHandler)
    
    print(f"=" * 50)
    print(f"Ticket Classifier API Server")
    print(f"=" * 50)
    print(f"Server running on http://localhost:{port}")
    print(f"Model loaded: {classifier.model_loaded}")
    print(f"")
    print(f"Endpoints:")
    print(f"  GET  /health         - Health check")
    print(f"  GET  /status         - System status")
    print(f"  GET  /agents         - List agents")
    print(f"  GET  /classify       - Classify (query params)")
    print(f"  POST /classify       - Classify (JSON body)")
    print(f"  POST /ticket         - Create and route ticket")
    print(f"  POST /ticket/close   - Close a ticket")
    print(f"  POST /reset          - Reset classifier state")
    print(f"=" * 50)
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        httpd.shutdown()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Ticket Classifier API Server')
    parser.add_argument('--port', type=int, default=5000, help='Port to run on')
    args = parser.parse_args()
    
    run_server(args.port)

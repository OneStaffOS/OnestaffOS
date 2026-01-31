#!/bin/bash
#
# Production startup script for IT Help Desk Chatbot API
# Uses Gunicorn instead of Flask development server
#

# Change to script directory
cd "$(dirname "$0")"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "⚠️  Virtual environment not found. Creating one..."
    python3 -m venv venv
    
    # Activate and install dependencies
    source venv/bin/activate
    echo "📦 Installing dependencies..."
    pip install -q -r requirements.txt
else
    # Just activate existing environment
    source venv/bin/activate
fi

# Export environment variables
export CHATBOT_PORT=${CHATBOT_PORT:-5050}
export GUNICORN_WORKERS=${GUNICORN_WORKERS:-4}
export LOG_LEVEL=${LOG_LEVEL:-info}

# Start Gunicorn
echo ""
echo "🚀 Starting Gunicorn production server..."
echo ""

exec gunicorn \
    --config gunicorn.conf.py \
    api_server:app

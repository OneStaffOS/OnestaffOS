#!/bin/bash

# IT Help Desk Chatbot - Startup Script
# This script starts the Python chatbot API server

echo "=============================================="
echo "🤖 IT Help Desk Chatbot API Server"
echo "=============================================="

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Check if virtual environment exists
if [ -d "venv" ]; then
    echo "📦 Activating virtual environment..."
    source venv/bin/activate
fi

# Check if required packages are installed
python3 -c "import flask, torch" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "⚠️  Some dependencies are missing. Installing..."
    pip install -r requirements.txt
fi

# Check if model exists
if [ ! -f "models/best_model.pt" ] && [ ! -f "models/final_model.pt" ]; then
    echo "❌ No trained model found!"
    echo "   Please train the model first:"
    echo "   1. python preprocess.py"
    echo "   2. python train.py"
    exit 1
fi

# Set environment variables
export CHATBOT_PORT=${CHATBOT_PORT:-5050}
export FLASK_DEBUG=${FLASK_DEBUG:-false}

echo ""
echo "📡 Starting server on port $CHATBOT_PORT..."
echo ""

# Start the server
python3 api_server.py

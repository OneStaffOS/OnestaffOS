#!/bin/bash
#
# Production startup script for Biometrics Service (FastAPI + Gunicorn)
#

cd "$(dirname "$0")"

if [ ! -d "venv" ]; then
    echo "WARNING: Virtual environment not found. Creating one..."
    python3 -m venv venv
    source venv/bin/activate
    echo "Installing dependencies..."
    pip install -q -r requirements.txt
else
    source venv/bin/activate
fi

export BIOMETRICS_PORT=${BIOMETRICS_PORT:-6000}
export GUNICORN_WORKERS=${GUNICORN_WORKERS:-2}
export LOG_LEVEL=${LOG_LEVEL:-info}

echo ""
echo "Starting Biometrics Service..."
echo ""

exec gunicorn \
    --config gunicorn.conf.py \
    app:app

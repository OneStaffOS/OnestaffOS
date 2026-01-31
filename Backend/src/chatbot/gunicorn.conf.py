"""
Gunicorn Configuration for IT Help Desk Chatbot API

Production-ready WSGI server configuration.
"""

import os
import multiprocessing

# Server socket
bind = f"0.0.0.0:{os.getenv('CHATBOT_PORT', '5050')}"
backlog = 2048

# Worker processes
workers = int(os.getenv('GUNICORN_WORKERS', multiprocessing.cpu_count() * 2 + 1))
worker_class = 'sync'
worker_connections = 1000
max_requests = 1000
max_requests_jitter = 50
timeout = 60
keepalive = 5

# Logging
accesslog = '-'  # Log to stdout
errorlog = '-'   # Log to stderr
loglevel = os.getenv('LOG_LEVEL', 'info')
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = 'chatbot-api'

# Server mechanics
daemon = False
pidfile = None
umask = 0
user = None
group = None
tmp_upload_dir = None

# Pre-load application (loads ML model once before forking)
preload_app = True

# Hooks
def on_starting(server):
    """Called just before the master process is initialized."""
    print("=" * 60)
    print("🤖 Starting IT Help Desk Chatbot API (Gunicorn)")
    print("=" * 60)
    print(f"  Bind: {bind}")
    print(f"  Workers: {workers}")
    print(f"  Timeout: {timeout}s")
    print("=" * 60)

def when_ready(server):
    """Called just after the server is started."""
    print("\n✅ Server is ready to accept connections")

def on_exit(server):
    """Called just before exiting Gunicorn."""
    print("\n👋 Shutting down Chatbot API...")

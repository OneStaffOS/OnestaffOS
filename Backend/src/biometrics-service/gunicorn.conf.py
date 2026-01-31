bind = f"0.0.0.0:{int(__import__('os').getenv('BIOMETRICS_PORT', '6000'))}"
workers = int(__import__('os').getenv('GUNICORN_WORKERS', '2'))
worker_class = 'uvicorn.workers.UvicornWorker'
timeout = int(__import__('os').getenv('GUNICORN_TIMEOUT', '120'))
loglevel = __import__('os').getenv('LOG_LEVEL', 'info')

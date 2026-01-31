FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    CHATBOT_PORT=5050 \
    GUNICORN_WORKERS=4 \
    LOG_LEVEL=info

WORKDIR /app

# System deps for torch and general ML runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY . ./

# Ensure the expected model filename exists for inference
RUN if [ ! -f "models/helpdesk_model.pt" ] && [ -f "models/best_model.pt" ]; then \
      cp models/best_model.pt models/helpdesk_model.pt; \
    fi

EXPOSE 5050

CMD ["gunicorn", "--config", "gunicorn.conf.py", "api_server:app"]

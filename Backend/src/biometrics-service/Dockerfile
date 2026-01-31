FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    BIOMETRICS_PORT=6000 \
    GUNICORN_WORKERS=2 \
    LOG_LEVEL=info \
    INSIGHTFACE_HOME=/app/.insightface

WORKDIR /app

# System deps for opencv/mediapipe/onnxruntime
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY . ./

# Pre-download and validate InsightFace model at build time to avoid runtime corruption
RUN python - <<'PY'
from insightface.app import FaceAnalysis
import os
model = os.getenv('INSIGHTFACE_MODEL', 'buffalo_l')
provider = os.getenv('BIOMETRICS_PROVIDER', 'CPUExecutionProvider')
size = int(os.getenv('BIOMETRICS_DET_SIZE', '640'))
app = FaceAnalysis(name=model, providers=[provider])
app.prepare(ctx_id=0, det_size=(size, size))
print('InsightFace model ready')
PY

EXPOSE 6000

CMD ["gunicorn", "--config", "gunicorn.conf.py", "app:app"]

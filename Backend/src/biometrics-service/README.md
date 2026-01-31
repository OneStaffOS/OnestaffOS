# Biometrics Service (FastAPI)

Internal service for face detection, embedding extraction, liveness checks, and
anti-spoof consistency checks.

## Endpoints

- `GET /health`
- `POST /analyze`

### `POST /analyze`

Request:
```json
{
  "frames": ["<base64-jpeg>", "<base64-jpeg>"],
  "livenessActions": ["blink", "smile"]
}
```

Response:
```json
{
  "ok": true,
  "embeddings": [[0.01, 0.02]],
  "embeddingDim": 512,
  "liveness": { "passed": true, "actions": { "blink": true, "smile": true } },
  "spoof": { "suspicious": false, "stabilityScore": 0.9, "variance": 0.1 },
  "quality": { "facesDetected": 1, "avgConfidence": 0.95, "minConfidence": 0.9 }
}
```

## Run (dev)

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
BIOMETRICS_PORT=6000 uvicorn app:app --host 0.0.0.0 --port 6000
```

## Run (production)

```bash
chmod +x start-production.sh
./start-production.sh
```

## Dataset env vars (evaluation only)

```
FACE_DATASET_ROOT=./facial-recognition
CASIA_WEBFACE_PATH=$FACE_DATASET_ROOT/CASIA-WebFace
LFW_PATH=$FACE_DATASET_ROOT/LFW
CELEBA_SPOOF_PATH=$FACE_DATASET_ROOT/CelebA-Spoof
CASIA_FASD_PATH=$FACE_DATASET_ROOT/CASIA-FASD
```

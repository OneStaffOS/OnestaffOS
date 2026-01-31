import base64
import logging
import os
import random
import warnings
from typing import List

import cv2
import numpy as np
import mediapipe as mp
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from insightface.app import FaceAnalysis

warnings.filterwarnings('ignore', category=FutureWarning, module='insightface')
warnings.filterwarnings('ignore', category=UserWarning, module='google.protobuf')

logging.basicConfig(level=os.getenv('LOG_LEVEL', 'info').upper())
logger = logging.getLogger('biometrics-service')

APP_TITLE = 'Biometrics Service'
APP_VERSION = '1.0.0'

INSIGHTFACE_MODEL = os.getenv('INSIGHTFACE_MODEL', 'buffalo_l')
DETECT_SIZE = int(os.getenv('BIOMETRICS_DET_SIZE', '640'))
PROVIDER = os.getenv('BIOMETRICS_PROVIDER', 'CPUExecutionProvider')

EAR_THRESHOLD = float(os.getenv('LIVENESS_EAR_THRESHOLD', '0.2'))
SMILE_THRESHOLD = float(os.getenv('LIVENESS_SMILE_THRESHOLD', '0.5'))
HEAD_TURN_THRESHOLD = float(os.getenv('LIVENESS_HEAD_TURN_THRESHOLD', '0.15'))

STABILITY_MIN = float(os.getenv('BIOMETRICS_STABILITY_MIN', '0.6'))
VARIANCE_MAX = float(os.getenv('BIOMETRICS_VARIANCE_MAX', '0.35'))

MAX_FRAMES = int(os.getenv('BIOMETRICS_MAX_FRAMES', '8'))
MIN_FRAMES = int(os.getenv('BIOMETRICS_MIN_FRAMES', '4'))

app = FastAPI(title=APP_TITLE, version=APP_VERSION)

face_app = FaceAnalysis(name=INSIGHTFACE_MODEL, providers=[PROVIDER])
face_app.prepare(ctx_id=0, det_size=(DETECT_SIZE, DETECT_SIZE))

mp_face_mesh = mp.solutions.face_mesh.FaceMesh(
    static_image_mode=True,
    max_num_faces=1,
    refine_landmarks=True,
    min_detection_confidence=0.5,
)


class AnalyzeRequest(BaseModel):
    frames: List[str] = Field(..., min_items=1)
    livenessActions: List[str] = Field(default_factory=list)


@app.get('/health')
def health():
    return {'ok': True}


@app.post('/analyze')
def analyze(payload: AnalyzeRequest):
    if len(payload.frames) < MIN_FRAMES or len(payload.frames) > MAX_FRAMES:
        raise HTTPException(status_code=400, detail='Invalid frame count')

    frames = [decode_frame(frame) for frame in payload.frames]
    faces = [detect_face(frame) for frame in frames]
    valid_faces = [face for face in faces if face is not None]

    if len(valid_faces) < MIN_FRAMES:
        raise HTTPException(status_code=400, detail='Face not detected in enough frames')

    embeddings = [normalize_embedding(face['embedding']) for face in valid_faces]
    avg_conf = float(np.mean([face['confidence'] for face in valid_faces]))
    min_conf = float(np.min([face['confidence'] for face in valid_faces]))
    multi_face = any(face['faces'] > 1 for face in valid_faces)

    liveness = evaluate_liveness(frames, payload.livenessActions)
    stability = evaluate_stability(frames, embeddings)
    if multi_face:
        stability['suspicious'] = True
        stability['reason'] = 'Multiple faces detected'

    return {
        'ok': True,
        'embeddings': embeddings,
        'embeddingDim': len(embeddings[0]),
        'liveness': liveness,
        'spoof': stability,
        'quality': {
            'facesDetected': len(faces),
            'avgConfidence': avg_conf,
            'minConfidence': min_conf,
        },
    }


def decode_frame(frame: str) -> np.ndarray:
    if frame.startswith('data:image'):
        frame = frame.split(',', 1)[1]
    data = base64.b64decode(frame)
    img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail='Invalid image frame')
    return img


def detect_face(img: np.ndarray):
    faces = face_app.get(img)
    if not faces:
        return None
    best = max(faces, key=lambda f: f.det_score)
    return {
        'embedding': best.embedding.astype(float).tolist(),
        'confidence': float(best.det_score),
        'bbox': best.bbox,
        'faces': len(faces),
    }


def evaluate_liveness(frames: List[np.ndarray], actions: List[str]):
    ear_values = []
    smile_values = []
    nose_ratios = []

    for frame in frames:
        metrics = extract_face_metrics(frame)
        if metrics is None:
            continue
        ear_values.append(metrics['ear'])
        smile_values.append(metrics['smile'])
        nose_ratios.append(metrics['nose_ratio'])

    results = {}
    for action in actions:
        if action == 'blink':
            results[action] = bool(has_blink(ear_values))
        elif action == 'smile':
            results[action] = bool(max(smile_values or [0]) >= SMILE_THRESHOLD)
        elif action == 'turn_left':
            # Image coordinates: user turns left -> nose shifts to the right (positive ratio)
            results[action] = bool(max(nose_ratios or [0]) >= HEAD_TURN_THRESHOLD)
        elif action == 'turn_right':
            results[action] = bool(min(nose_ratios or [0]) <= -HEAD_TURN_THRESHOLD)
        else:
            results[action] = False

    passed = bool(all(results.values())) if actions else True
    return {'passed': passed, 'actions': results}


def evaluate_stability(frames: List[np.ndarray], embeddings: List[List[float]]):
    augmented_embeddings = []
    for frame in frames:
        for _ in range(2):
            aug = augment_frame(frame)
            face = detect_face(aug)
            if face:
                augmented_embeddings.append(np.array(normalize_embedding(face['embedding']), dtype=np.float32))

    base_embeddings = [np.array(e, dtype=np.float32) for e in embeddings]
    if not base_embeddings:
        return {
            'suspicious': True,
            'reason': 'No embeddings available',
            'stabilityScore': 0.0,
            'variance': 1.0,
        }

    if not augmented_embeddings:
        logger.warning('No embeddings from augmentations; using base embeddings only')

    embedding_matrix = np.vstack(base_embeddings + augmented_embeddings)
    norms = np.linalg.norm(embedding_matrix, axis=1, keepdims=True)
    embedding_matrix = embedding_matrix / np.maximum(norms, 1e-6)
    mean_vec = embedding_matrix.mean(axis=0)
    mean_vec = mean_vec / (np.linalg.norm(mean_vec) + 1e-6)
    cosine_sim = embedding_matrix @ mean_vec
    distances = 1.0 - cosine_sim
    variance = float(distances.mean())
    stability_score = float(np.exp(-variance))

    suspicious = bool(stability_score < STABILITY_MIN or variance > VARIANCE_MAX)
    reason = None
    if suspicious:
        reason = 'Embedding instability detected'

    return {
        'suspicious': bool(suspicious),
        'reason': reason,
        'stabilityScore': float(stability_score),
        'variance': float(variance),
    }


def normalize_embedding(embedding: List[float]) -> List[float]:
    vec = np.array(embedding, dtype=np.float32)
    norm = np.linalg.norm(vec) or 1.0
    return (vec / norm).astype(float).tolist()


def augment_frame(frame: np.ndarray) -> np.ndarray:
    scale = random.uniform(0.9, 1.1)
    h, w = frame.shape[:2]
    resized = cv2.resize(frame, (int(w * scale), int(h * scale)))
    resized = cv2.resize(resized, (w, h))
    quality = random.randint(60, 90)
    encode_params = [int(cv2.IMWRITE_JPEG_QUALITY), quality]
    _, encoded = cv2.imencode('.jpg', resized, encode_params)
    decoded = cv2.imdecode(encoded, cv2.IMREAD_COLOR)
    return decoded if decoded is not None else frame


def extract_face_metrics(frame: np.ndarray):
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    result = mp_face_mesh.process(rgb)
    if not result.multi_face_landmarks:
        return None

    landmarks = result.multi_face_landmarks[0].landmark
    left_eye = [landmarks[i] for i in [33, 160, 158, 133, 153, 144]]
    right_eye = [landmarks[i] for i in [263, 387, 385, 362, 380, 373]]
    mouth = [landmarks[i] for i in [61, 291, 78, 308, 13, 14]]
    nose = landmarks[1]

    ear = (eye_aspect_ratio(left_eye) + eye_aspect_ratio(right_eye)) / 2
    smile = mouth_aspect_ratio(mouth)
    nose_ratio = (nose.x - 0.5) * 2

    return {'ear': ear, 'smile': smile, 'nose_ratio': nose_ratio}


def eye_aspect_ratio(eye_points):
    v1 = distance(eye_points[1], eye_points[5])
    v2 = distance(eye_points[2], eye_points[4])
    h = distance(eye_points[0], eye_points[3])
    return (v1 + v2) / (2.0 * h + 1e-6)


def mouth_aspect_ratio(mouth_points):
    width = distance(mouth_points[0], mouth_points[1])
    height = distance(mouth_points[4], mouth_points[5])
    return height / (width + 1e-6)


def has_blink(ear_values: List[float]):
    if not ear_values:
        return False
    return min(ear_values) < EAR_THRESHOLD and max(ear_values) > EAR_THRESHOLD


def distance(p1, p2):
    return np.linalg.norm(np.array([p1.x, p1.y]) - np.array([p2.x, p2.y]))

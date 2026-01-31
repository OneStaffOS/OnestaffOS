"use client";

import { useEffect, useRef, useState } from 'react';
import axios from '@/lib/axios-config';
import { encryptBiometricsPayload } from '@/lib/biometrics-encryption';

type BiometricsMode = 'ENROLL' | 'VERIFY';

type ChallengeResponse = {
  challengeId: string;
  nonce: string;
  expiresAt: string;
  livenessActions: string[];
  publicKey: string;
};

type BiometricsModalProps = {
  open: boolean;
  mode: BiometricsMode;
  onClose: () => void;
  onSuccess: (result: { verificationToken?: string }) => void;
};

const captureIntervalMs = 300;
const frameCount = 8;
const warmupFrames = 2;
const videoReadyTimeoutMs = 4000;

const waitForVideoReady = (video: HTMLVideoElement) => new Promise<void>((resolve, reject) => {
  if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
    resolve();
    return;
  }

  const timeout = setTimeout(() => {
    cleanup();
    reject(new Error('Camera did not start in time'));
  }, videoReadyTimeoutMs);

  const cleanup = () => {
    clearTimeout(timeout);
    video.removeEventListener('loadeddata', handleReady);
    video.removeEventListener('error', handleError);
  };

  const handleReady = () => {
    cleanup();
    resolve();
  };

  const handleError = () => {
    cleanup();
    reject(new Error('Camera failed to initialize'));
  };

  video.addEventListener('loadeddata', handleReady);
  video.addEventListener('error', handleError);
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function BiometricsModal({ open, mode, onClose, onSuccess }: BiometricsModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'capturing' | 'encrypting' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<ChallengeResponse | null>(null);

  useEffect(() => {
    if (!open) {
      stopCamera();
      setStatus('idle');
      setErrorMessage(null);
      setChallenge(null);
      return;
    }

    const init = async () => {
      try {
        setStatus('loading');
        await fetchChallenge();
        await startCamera();
        setStatus('idle');
      } catch (err: any) {
        setErrorMessage(err.response?.data?.message || err.message || 'Failed to initialize biometrics');
        setStatus('error');
      }
    };

    init();
    return () => stopCamera();
  }, [open, mode]);

  const startCamera = async () => {
    if (streamRef.current) return;
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }
  };

  const fetchChallenge = async (): Promise<ChallengeResponse> => {
    const res = await axios.post('/biometrics/challenge', { action: mode });
    setChallenge(res.data);
    return res.data as ChallengeResponse;
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const captureFrames = async () => {
    if (!videoRef.current) {
      throw new Error('Camera not ready');
    }
    const video = videoRef.current;
    await waitForVideoReady(video);
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas unavailable');
    }

    for (let i = 0; i < warmupFrames; i += 1) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      await sleep(captureIntervalMs / 2);
    }

    const frames: string[] = [];
    for (let i = 0; i < frameCount; i += 1) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      frames.push(dataUrl.split(',')[1]);
      await sleep(captureIntervalMs);
    }

    return frames;
  };

  const handleStart = async () => {
    try {
      setErrorMessage(null);
      let activeChallenge = challenge;
      if (!activeChallenge) {
        setStatus('loading');
        activeChallenge = await fetchChallenge();
      }
      setStatus('capturing');
      const frames = await captureFrames();
      setStatus('encrypting');
      const encrypted = await encryptBiometricsPayload(activeChallenge.publicKey, {
        frames,
        metadata: {
          clientTimestamp: Date.now(),
          mode,
        },
      });

      setStatus('submitting');
      const endpoint = mode === 'ENROLL' ? '/biometrics/enroll' : '/biometrics/verify';
      const res = await axios.post(endpoint, {
        challengeId: activeChallenge.challengeId,
        nonce: activeChallenge.nonce,
        payload: encrypted,
      });

      setStatus('success');
      onSuccess({
        verificationToken: res.data?.verificationToken,
      });
    } catch (err: any) {
      const responseMessage = err.response?.data?.message;
      const message = Array.isArray(responseMessage)
        ? responseMessage.join(', ')
        : responseMessage;
      setErrorMessage(message || err.message || 'Biometrics failed');
      setStatus('error');
      setChallenge(null);
    }
  };

  if (!open) {
    return null;
  }

  const isBusy = ['loading', 'capturing', 'encrypting', 'submitting'].includes(status);

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>{mode === 'ENROLL' ? 'Save / Update Face Print' : 'Face Verification'}</h3>
          <button onClick={onClose} style={closeButtonStyle}>X</button>
        </div>

        <div style={{ marginTop: '1rem' }}>
          <video ref={videoRef} style={videoStyle} playsInline muted />
        </div>

        {challenge?.livenessActions?.length ? (
          <div style={instructionsStyle}>
            <strong>Follow the liveness prompts:</strong>
            <ul style={{ margin: '0.5rem 0 0 1rem' }}>
              {challenge.livenessActions.map((action) => (
                <li key={action}>{formatAction(action)}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {errorMessage ? (
          <div style={errorStyle}>{errorMessage}</div>
        ) : null}

        <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
          <button
            onClick={handleStart}
            disabled={isBusy}
            style={{
              ...actionButtonStyle,
              opacity: isBusy ? 0.7 : 1,
            }}
          >
            {status === 'capturing' ? 'Capturing...' :
             status === 'encrypting' ? 'Encrypting...' :
             status === 'submitting' ? 'Submitting...' :
             status === 'error' ? 'Retry' :
             mode === 'ENROLL' ? 'Save Face Print' : 'Verify & Clock In'}
          </button>
          <button onClick={onClose} style={secondaryButtonStyle}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function formatAction(action: string) {
  switch (action) {
    case 'turn_left':
      return 'Turn your head left (your left)';
    case 'turn_right':
      return 'Turn your head right (your right)';
    case 'blink':
      return 'Blink';
    case 'smile':
      return 'Smile';
    default:
      return action;
  }
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
};

const modalStyle: React.CSSProperties = {
  background: '#fff',
  padding: '1.5rem',
  borderRadius: '12px',
  width: '90%',
  maxWidth: '480px',
  boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
};

const videoStyle: React.CSSProperties = {
  width: '100%',
  borderRadius: '10px',
  background: '#111',
  minHeight: '240px',
};

const instructionsStyle: React.CSSProperties = {
  marginTop: '0.75rem',
  padding: '0.75rem',
  background: '#f9fafb',
  borderRadius: '8px',
  fontSize: '0.9rem',
};

const errorStyle: React.CSSProperties = {
  marginTop: '0.75rem',
  padding: '0.75rem',
  background: '#fee2e2',
  color: '#b91c1c',
  borderRadius: '8px',
  fontSize: '0.9rem',
};

const actionButtonStyle: React.CSSProperties = {
  flex: 1,
  padding: '0.75rem 1rem',
  borderRadius: '8px',
  border: 'none',
  background: '#2563eb',
  color: '#fff',
  fontWeight: 600,
  cursor: 'pointer',
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  borderRadius: '8px',
  border: '1px solid #d1d5db',
  background: '#fff',
  color: '#111827',
  cursor: 'pointer',
};

const closeButtonStyle: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: '1rem',
};
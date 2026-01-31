export type BiometricsEncryptedPayload = {
  ciphertext: string;
  iv: string;
  tag: string;
  encryptedKey: string;
  keyType: 'biometrics';
  timestamp: number;
  version: number;
};

const AES_ALGORITHM = 'AES-GCM';
const AES_KEY_LENGTH = 256;
const IV_LENGTH = 12;
const ENCRYPTION_VERSION = 1;

function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function importPublicKey(pemKey: string): Promise<CryptoKey> {
  const pemContents = pemKey
    .replace(/-----BEGIN PUBLIC KEY-----/, '')
    .replace(/-----END PUBLIC KEY-----/, '')
    .replace(/\s/g, '');
  const binaryKey = base64ToArrayBuffer(pemContents);
  return crypto.subtle.importKey(
    'spki',
    binaryKey,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt'],
  );
}

async function generateSessionKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: AES_ALGORITHM, length: AES_KEY_LENGTH },
    true,
    ['encrypt', 'decrypt'],
  );
}

async function encryptSessionKey(sessionKey: CryptoKey, serverPublicKey: CryptoKey): Promise<string> {
  const rawKey = await crypto.subtle.exportKey('raw', sessionKey);
  const encrypted = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, serverPublicKey, rawKey);
  return arrayBufferToBase64(encrypted);
}

async function encryptWithAES(
  plaintext: string,
  key: CryptoKey,
): Promise<{ ciphertext: string; iv: string; tag: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  const encrypted = await crypto.subtle.encrypt(
    { name: AES_ALGORITHM, iv: iv.buffer as ArrayBuffer, tagLength: 128 },
    key,
    data,
  );
  const encryptedArray = new Uint8Array(encrypted);
  const tagStart = encryptedArray.length - 16;
  const ciphertext = encryptedArray.slice(0, tagStart);
  const tag = encryptedArray.slice(tagStart);

  return {
    ciphertext: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv),
    tag: arrayBufferToBase64(tag),
  };
}

export async function encryptBiometricsPayload(
  serverPublicKeyPem: string,
  payload: object,
): Promise<BiometricsEncryptedPayload> {
  const serverPublicKey = await importPublicKey(serverPublicKeyPem);
  const sessionKey = await generateSessionKey();
  const encryptedKey = await encryptSessionKey(sessionKey, serverPublicKey);
  const plaintext = JSON.stringify(payload);
  const { ciphertext, iv, tag } = await encryptWithAES(plaintext, sessionKey);

  return {
    ciphertext,
    iv,
    tag,
    encryptedKey,
    keyType: 'biometrics',
    timestamp: Date.now(),
    version: ENCRYPTION_VERSION,
  };
}

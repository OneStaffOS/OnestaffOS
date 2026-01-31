/**
 * Frontend Encryption Utilities
 * 
 * Implements client-side encryption using Web Crypto API for end-to-end message encryption.
 * 
 * Features:
 * - AES-256-GCM for message encryption
 * - RSA-OAEP for key exchange
 * - Hybrid encryption for secure message transmission
 * - Session key management
 */

// Types
export interface EncryptedPayload {
  ciphertext: string; // Base64 encoded
  iv: string; // Base64 encoded
  tag: string; // Base64 encoded
  encryptedKey?: string; // Base64 encoded RSA-encrypted session key
  keyType: 'ai_chatbot' | 'live_chat';
  timestamp: number;
  version: number;
}

// Simplified type for server responses (without metadata)
export interface ServerEncryptedData {
  ciphertext: string;
  iv: string;
  tag: string;
}

export interface EncryptionSession {
  sessionId: string;
  sessionKey: CryptoKey;
  serverPublicKey: CryptoKey;
  keyType: 'ai_chatbot' | 'live_chat';
  createdAt: Date;
  expiresAt: Date;
}

// Constants
const AES_ALGORITHM = 'AES-GCM';
const AES_KEY_LENGTH = 256;
const IV_LENGTH = 12;
const ENCRYPTION_VERSION = 1;
const SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes

// Session storage
const sessions: Map<string, EncryptionSession> = new Map();

/**
 * Convert ArrayBuffer or Uint8Array to Base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Generate a random IV for AES-GCM
 */
function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
}

/**
 * Generate a random session ID
 */
function generateSessionId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Import server's RSA public key from PEM format
 */
async function importPublicKey(pemKey: string): Promise<CryptoKey> {
  // Remove PEM headers and convert to ArrayBuffer
  const pemContents = pemKey
    .replace(/-----BEGIN PUBLIC KEY-----/, '')
    .replace(/-----END PUBLIC KEY-----/, '')
    .replace(/\s/g, '');
  
  const binaryKey = base64ToArrayBuffer(pemContents);
  
  return crypto.subtle.importKey(
    'spki',
    binaryKey,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    false,
    ['encrypt']
  );
}

/**
 * Generate AES session key
 */
async function generateSessionKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    {
      name: AES_ALGORITHM,
      length: AES_KEY_LENGTH,
    },
    true, // extractable for key exchange
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt session key with server's RSA public key
 */
async function encryptSessionKey(
  sessionKey: CryptoKey,
  serverPublicKey: CryptoKey
): Promise<string> {
  // Export session key
  const rawKey = await crypto.subtle.exportKey('raw', sessionKey);
  
  // Encrypt with RSA
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'RSA-OAEP',
    },
    serverPublicKey,
    rawKey
  );
  
  return arrayBufferToBase64(encrypted);
}

/**
 * Encrypt message with AES-GCM
 */
async function encryptWithAES(
  plaintext: string,
  key: CryptoKey
): Promise<{ ciphertext: string; iv: string; tag: string }> {
  const iv = generateIV();
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  
  const encrypted = await crypto.subtle.encrypt(
    {
      name: AES_ALGORITHM,
      iv: iv.buffer as ArrayBuffer,
      tagLength: 128, // 16 bytes
    },
    key,
    data
  );
  
  // In WebCrypto, the tag is appended to the ciphertext
  // We need to split them
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

/**
 * Decrypt message with AES-GCM
 */
async function decryptWithAES(
  ciphertext: string,
  iv: string,
  tag: string,
  key: CryptoKey
): Promise<string> {
  const ivBuffer = new Uint8Array(base64ToArrayBuffer(iv));
  const ciphertextBuffer = new Uint8Array(base64ToArrayBuffer(ciphertext));
  const tagBuffer = new Uint8Array(base64ToArrayBuffer(tag));
  
  // Combine ciphertext and tag (WebCrypto expects them together)
  const combined = new Uint8Array(ciphertextBuffer.length + tagBuffer.length);
  combined.set(ciphertextBuffer);
  combined.set(tagBuffer, ciphertextBuffer.length);
  
  const decrypted = await crypto.subtle.decrypt(
    {
      name: AES_ALGORITHM,
      iv: ivBuffer.buffer as ArrayBuffer,
      tagLength: 128,
    },
    key,
    combined
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

// ==========================================
// Public API
// ==========================================

/**
 * Initialize encryption session with server's public key
 */
export async function initEncryptionSession(
  serverPublicKeyPem: string,
  keyType: 'ai_chatbot' | 'live_chat'
): Promise<{ sessionId: string; encryptedSessionKey: string }> {
  // Import server's public key
  const serverPublicKey = await importPublicKey(serverPublicKeyPem);
  
  // Generate session key
  const sessionKey = await generateSessionKey();
  
  // Encrypt session key for server
  const encryptedSessionKey = await encryptSessionKey(sessionKey, serverPublicKey);
  
  // Generate session ID
  const sessionId = generateSessionId();
  
  // Store session
  const session: EncryptionSession = {
    sessionId,
    sessionKey,
    serverPublicKey,
    keyType,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
  };
  sessions.set(sessionId, session);
  
  // Clean up expired sessions
  cleanupExpiredSessions();
  
  return { sessionId, encryptedSessionKey };
}

/**
 * Encrypt a message for transmission
 */
export async function encryptMessage(
  message: string,
  sessionId: string
): Promise<EncryptedPayload> {
  const session = sessions.get(sessionId);
  
  if (!session) {
    throw new Error('Invalid or expired encryption session');
  }
  
  if (session.expiresAt < new Date()) {
    sessions.delete(sessionId);
    throw new Error('Encryption session expired');
  }
  
  const { ciphertext, iv, tag } = await encryptWithAES(message, session.sessionKey);
  
  return {
    ciphertext,
    iv,
    tag,
    keyType: session.keyType,
    timestamp: Date.now(),
    version: ENCRYPTION_VERSION,
  };
}

/**
 * Decrypt a message from server
 */
export async function decryptMessage(
  encryptedPayload: EncryptedPayload | ServerEncryptedData,
  sessionId: string
): Promise<string> {
  const session = sessions.get(sessionId);
  
  if (!session) {
    throw new Error('Invalid or expired encryption session');
  }
  
  if (session.expiresAt < new Date()) {
    sessions.delete(sessionId);
    throw new Error('Encryption session expired');
  }
  
  return decryptWithAES(
    encryptedPayload.ciphertext,
    encryptedPayload.iv,
    encryptedPayload.tag,
    session.sessionKey
  );
}

/**
 * Check if a session is valid
 */
export function isSessionValid(sessionId: string): boolean {
  const session = sessions.get(sessionId);
  if (!session) return false;
  if (session.expiresAt < new Date()) {
    sessions.delete(sessionId);
    return false;
  }
  return true;
}

/**
 * Extend session expiration
 */
export function extendSession(sessionId: string): boolean {
  const session = sessions.get(sessionId);
  if (!session) return false;
  
  session.expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  return true;
}

/**
 * End encryption session
 */
export function endSession(sessionId: string): void {
  sessions.delete(sessionId);
}

/**
 * Clean up expired sessions
 */
function cleanupExpiredSessions(): void {
  const now = new Date();
  for (const [id, session] of sessions.entries()) {
    if (session.expiresAt < now) {
      sessions.delete(id);
    }
  }
}

/**
 * Get session info (for debugging)
 */
export function getSessionInfo(sessionId: string): {
  keyType: string;
  createdAt: Date;
  expiresAt: Date;
  isValid: boolean;
} | null {
  const session = sessions.get(sessionId);
  if (!session) return null;
  
  return {
    keyType: session.keyType,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    isValid: session.expiresAt >= new Date(),
  };
}

// ==========================================
// Simplified API for Chat Features
// ==========================================

/**
 * Chat encryption manager - handles session lifecycle automatically
 */
export class ChatEncryption {
  private sessionId: string | null = null;
  private keyType: 'ai_chatbot' | 'live_chat';
  private serverPublicKey: string | null = null;
  
  constructor(keyType: 'ai_chatbot' | 'live_chat') {
    this.keyType = keyType;
  }
  
  /**
   * Initialize with server's public key
   */
  async initialize(serverPublicKeyPem: string): Promise<string> {
    this.serverPublicKey = serverPublicKeyPem;
    const { sessionId, encryptedSessionKey } = await initEncryptionSession(
      serverPublicKeyPem,
      this.keyType
    );
    this.sessionId = sessionId;
    return encryptedSessionKey;
  }
  
  /**
   * Check if initialized and session is valid
   */
  isReady(): boolean {
    return this.sessionId !== null && isSessionValid(this.sessionId);
  }
  
  /**
   * Encrypt outgoing message
   */
  async encrypt(message: string): Promise<EncryptedPayload> {
    if (!this.sessionId) {
      throw new Error('ChatEncryption not initialized');
    }
    
    // Extend session on use
    extendSession(this.sessionId);
    
    return encryptMessage(message, this.sessionId);
  }
  
  /**
   * Decrypt incoming message
   */
  async decrypt(payload: EncryptedPayload | ServerEncryptedData): Promise<string> {
    if (!this.sessionId) {
      throw new Error('ChatEncryption not initialized');
    }
    
    // Extend session on use
    extendSession(this.sessionId);
    
    return decryptMessage(payload, this.sessionId);
  }
  
  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }
  
  /**
   * Re-initialize if session expired
   */
  async refresh(): Promise<string | null> {
    if (this.serverPublicKey) {
      return this.initialize(this.serverPublicKey);
    }
    return null;
  }
  
  /**
   * Clean up
   */
  destroy(): void {
    if (this.sessionId) {
      endSession(this.sessionId);
      this.sessionId = null;
    }
  }
}

// ==========================================
// Utility Functions
// ==========================================

/**
 * Hash a message (for deduplication without exposing content)
 */
export async function hashMessage(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return arrayBufferToBase64(hashBuffer);
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Check if WebCrypto is available
 */
export function isEncryptionSupported(): boolean {
  return typeof crypto !== 'undefined' && 
         typeof crypto.subtle !== 'undefined' &&
         typeof crypto.getRandomValues !== 'undefined';
}

// Export singleton instances for convenience
export const chatbotEncryption = new ChatEncryption('ai_chatbot');
export const liveChatEncryption = new ChatEncryption('live_chat');

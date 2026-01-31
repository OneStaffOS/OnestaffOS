import { ensureBankingKey } from './banking-key-store';

export type SignedTransactionPayload = {
  txId: string;
  actorId: string;
  actorRole: string;
  action: string;
  contractId?: string;
  amount?: number;
  currency?: string;
  nonce: string;
  timestamp: string;
};

export type SignedActionDto = {
  payload: SignedTransactionPayload;
  signature: string;
  actorKeyId: string;
};

function stableStringify(value: any): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const keys = Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort();
    const entries = keys.map(
      (key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`,
    );
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
}

function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

function generateNonce(length: number = 16): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function generateObjectId(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function generateTxId(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `tx-${Date.now()}-${generateNonce(8)}`;
}

async function hashPayload(payload: SignedTransactionPayload): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(stableStringify(payload));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return arrayBufferToHex(hashBuffer);
}

export async function buildSignedAction(input: {
  actorId: string;
  actorRole: string;
  action: string;
  amount?: number;
  contractId?: string;
  currency?: string;
}): Promise<SignedActionDto> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('WebCrypto is not available in this browser');
  }

  const keyRecord = await ensureBankingKey(input.actorId, input.actorRole);
  const payload: SignedTransactionPayload = {
    txId: generateTxId(),
    actorId: input.actorId,
    actorRole: input.actorRole,
    action: input.action,
    nonce: generateNonce(),
    timestamp: new Date().toISOString(),
  };

  if (input.contractId) {
    payload.contractId = input.contractId;
  }
  if (typeof input.amount === 'number') {
    payload.amount = input.amount;
  }
  if (input.currency) {
    payload.currency = input.currency;
  }

  const payloadHash = await hashPayload(payload);
  const payloadBytes = hexToUint8Array(payloadHash);
  const payloadBuffer = new ArrayBuffer(payloadBytes.byteLength);
  new Uint8Array(payloadBuffer).set(payloadBytes);
  const signatureBuffer = await crypto.subtle.sign(
    'Ed25519',
    keyRecord.privateKey,
    payloadBuffer,
  );

  return {
    payload,
    signature: arrayBufferToBase64(signatureBuffer),
    actorKeyId: keyRecord.keyId,
  };
}

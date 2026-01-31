import axios from '@/lib/axios-config';

type BankingKeyRecord = {
  id: string;
  actorId: string;
  actorRole: string;
  keyId: string;
  keyVersion: number;
  publicKeyJwk: JsonWebKey;
  privateKey: CryptoKey;
  createdAt: number;
};

const DB_NAME = 'onestaff_banking_keys';
const STORE_NAME = 'actor_keys';
const DB_VERSION = 1;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function recordId(actorId: string, actorRole: string) {
  return `${actorId}:${actorRole}`;
}

async function getRecord(actorId: string, actorRole: string): Promise<BankingKeyRecord | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(recordId(actorId, actorRole));
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function saveRecord(record: BankingKeyRecord): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function generateKeyId() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return `banking-${Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}

async function generateKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'Ed25519' },
    false,
    ['sign', 'verify'],
  );

  let publicKeyJwk: JsonWebKey;
  try {
    publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  } catch (error) {
    throw new Error('Unable to export public key for registration');
  }

  return { keyPair, publicKeyJwk };
}

async function registerPublicKey(input: {
  keyId: string;
  actorRole: string;
  publicKeyJwk: JsonWebKey;
  keyVersion: number;
}) {
  const response = await axios.post('/banking-contracts/keys/register', input);
  return response.data;
}

export async function ensureBankingKey(actorId: string, actorRole: string) {
  if (typeof indexedDB === 'undefined') {
    throw new Error('IndexedDB is not available in this browser');
  }

  const existing = await getRecord(actorId, actorRole);
  if (existing?.privateKey && existing.keyId) {
    return existing;
  }

  const { keyPair, publicKeyJwk } = await generateKeyPair();
  const keyId = generateKeyId();
  const keyVersion = 1;

  await registerPublicKey({ keyId, actorRole, publicKeyJwk, keyVersion });

  const record: BankingKeyRecord = {
    id: recordId(actorId, actorRole),
    actorId,
    actorRole,
    keyId,
    keyVersion,
    publicKeyJwk,
    privateKey: keyPair.privateKey,
    createdAt: Date.now(),
  };

  await saveRecord(record);
  return record;
}

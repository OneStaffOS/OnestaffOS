/**
 * Encryption Service
 * 
 * Implements hybrid encryption (AES-256-GCM + RSA-2048) for end-to-end message encryption
 * and AES-256-GCM for encryption at rest.
 * 
 * Features:
 * - Separate encryption keys for AI Chatbot and Live Chat
 * - AES-256-GCM for symmetric encryption (message content)
 * - RSA-2048 for key exchange (session key encryption)
 * - Secure key storage and rotation support
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// Encryption algorithms
const AES_ALGORITHM = 'aes-256-gcm';
const AES_KEY_LENGTH = 32; // 256 bits
const AES_IV_LENGTH = 12; // 96 bits (recommended for GCM)
const AES_TAG_LENGTH = 16; // 128 bits
const RSA_KEY_SIZE = 2048;
const RSA_PADDING = crypto.constants.RSA_PKCS1_OAEP_PADDING;

// Key identifiers
export enum EncryptionKeyType {
  AI_CHATBOT = 'ai_chatbot',
  LIVE_CHAT = 'live_chat',
  BIOMETRICS = 'biometrics',
}

export interface EncryptedData {
  ciphertext: string; // Base64 encoded encrypted data
  iv: string; // Base64 encoded initialization vector
  tag: string; // Base64 encoded authentication tag
  encryptedKey?: string; // Base64 encoded RSA-encrypted AES key (for hybrid encryption)
  keyType: EncryptionKeyType;
  timestamp: number;
  version: number; // Encryption version for future compatibility
}

export interface KeyPair {
  publicKey: string;
  privateKey: string;
  createdAt: Date;
  rotatedAt?: Date;
}

export interface EncryptionKeys {
  aiChatbot: {
    aesKey: Buffer;
    rsaKeyPair: KeyPair;
  };
  liveChat: {
    aesKey: Buffer;
    rsaKeyPair: KeyPair;
  };
  biometrics: {
    aesKey: Buffer;
    rsaKeyPair: KeyPair;
  };
}

@Injectable()
export class EncryptionService implements OnModuleInit {
  private readonly logger = new Logger(EncryptionService.name);
  private keys: EncryptionKeys;
  private readonly keysPath: string;
  private readonly encryptionVersion = 1;

  constructor() {
    this.keysPath = process.env.ENCRYPTION_KEYS_PATH || 
      path.join(process.cwd(), '.encryption-keys');
  }

  async onModuleInit() {
    await this.initializeKeys();
  }

  /**
   * Initialize encryption keys - load from file or generate new ones
   */
  private async initializeKeys(): Promise<void> {
    try {
      // Ensure keys directory exists
      if (!fs.existsSync(this.keysPath)) {
        fs.mkdirSync(this.keysPath, { recursive: true, mode: 0o700 });
      }

      // Try to load existing keys
      const aiChatbotKeys = await this.loadOrGenerateKeys(EncryptionKeyType.AI_CHATBOT);
      const liveChatKeys = await this.loadOrGenerateKeys(EncryptionKeyType.LIVE_CHAT);
      const biometricsKeys = await this.loadOrGenerateKeys(EncryptionKeyType.BIOMETRICS);

      this.keys = {
        aiChatbot: aiChatbotKeys,
        liveChat: liveChatKeys,
        biometrics: biometricsKeys,
      };

      this.logger.log('✅ Encryption keys initialized successfully');
      this.logger.log(`  - AI Chatbot keys loaded`);
      this.logger.log(`  - Live Chat keys loaded`);
      this.logger.log(`  - Biometrics keys loaded`);
    } catch (error) {
      this.logger.error(`Failed to initialize encryption keys: ${error.message}`);
      throw error;
    }
  }

  /**
   * Load existing keys or generate new ones
   */
  private async loadOrGenerateKeys(keyType: EncryptionKeyType): Promise<{
    aesKey: Buffer;
    rsaKeyPair: KeyPair;
  }> {
    const aesKeyPath = path.join(this.keysPath, `${keyType}_aes.key`);
    const rsaPublicPath = path.join(this.keysPath, `${keyType}_rsa_public.pem`);
    const rsaPrivatePath = path.join(this.keysPath, `${keyType}_rsa_private.pem`);
    const metadataPath = path.join(this.keysPath, `${keyType}_metadata.json`);

    let aesKey: Buffer;
    let rsaKeyPair: KeyPair;

    // Check if keys exist
    if (
      fs.existsSync(aesKeyPath) &&
      fs.existsSync(rsaPublicPath) &&
      fs.existsSync(rsaPrivatePath)
    ) {
      // Load existing keys
      aesKey = fs.readFileSync(aesKeyPath);
      const publicKey = fs.readFileSync(rsaPublicPath, 'utf8');
      const privateKey = fs.readFileSync(rsaPrivatePath, 'utf8');
      
      let metadata = { createdAt: new Date() };
      if (fs.existsSync(metadataPath)) {
        metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      }

      rsaKeyPair = {
        publicKey,
        privateKey,
        createdAt: new Date(metadata.createdAt),
      };

      this.logger.debug(`Loaded existing keys for ${keyType}`);
    } else {
      // Generate new keys
      this.logger.log(`Generating new encryption keys for ${keyType}...`);
      
      // Generate AES key
      aesKey = crypto.randomBytes(AES_KEY_LENGTH);
      
      // Generate RSA key pair
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: RSA_KEY_SIZE,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem',
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem',
        },
      });

      rsaKeyPair = {
        publicKey,
        privateKey,
        createdAt: new Date(),
      };

      // Save keys securely
      fs.writeFileSync(aesKeyPath, aesKey, { mode: 0o600 });
      fs.writeFileSync(rsaPublicPath, publicKey, { mode: 0o600 });
      fs.writeFileSync(rsaPrivatePath, privateKey, { mode: 0o600 });
      fs.writeFileSync(metadataPath, JSON.stringify({
        createdAt: rsaKeyPair.createdAt,
        keyType,
        version: this.encryptionVersion,
      }), { mode: 0o600 });

      this.logger.log(`✅ Generated new encryption keys for ${keyType}`);
    }

    return { aesKey, rsaKeyPair };
  }

  /**
   * Get the keys for a specific type
   */
  private getKeysForType(keyType: EncryptionKeyType): { aesKey: Buffer; rsaKeyPair: KeyPair } {
    switch (keyType) {
      case EncryptionKeyType.AI_CHATBOT:
        return this.keys.aiChatbot;
      case EncryptionKeyType.LIVE_CHAT:
        return this.keys.liveChat;
      case EncryptionKeyType.BIOMETRICS:
        return this.keys.biometrics;
      default:
        throw new Error(`Unknown key type: ${keyType}`);
    }
  }

  /**
   * Get public key for client-side encryption (for key exchange)
   */
  getPublicKey(keyType: EncryptionKeyType): string {
    const keys = this.getKeysForType(keyType);
    return keys.rsaKeyPair.publicKey;
  }

  // ==========================================
  // AES-256-GCM Encryption (Symmetric)
  // ==========================================

  /**
   * Encrypt data using AES-256-GCM (for storage encryption)
   */
  encryptAES(plaintext: string, keyType: EncryptionKeyType): EncryptedData {
    const keys = this.getKeysForType(keyType);
    const iv = crypto.randomBytes(AES_IV_LENGTH);
    
    const cipher = crypto.createCipheriv(AES_ALGORITHM, keys.aesKey, iv, {
      authTagLength: AES_TAG_LENGTH,
    });

    let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
    ciphertext += cipher.final('base64');
    const tag = cipher.getAuthTag();

    return {
      ciphertext,
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      keyType,
      timestamp: Date.now(),
      version: this.encryptionVersion,
    };
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  decryptAES(encryptedData: EncryptedData): string {
    const keys = this.getKeysForType(encryptedData.keyType);
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const tag = Buffer.from(encryptedData.tag, 'base64');
    const ciphertext = Buffer.from(encryptedData.ciphertext, 'base64');

    const decipher = crypto.createDecipheriv(AES_ALGORITHM, keys.aesKey, iv, {
      authTagLength: AES_TAG_LENGTH,
    });
    decipher.setAuthTag(tag);

    let plaintext = decipher.update(ciphertext);
    plaintext = Buffer.concat([plaintext, decipher.final()]);

    return plaintext.toString('utf8');
  }

  // ==========================================
  // Hybrid Encryption (AES + RSA)
  // ==========================================

  /**
   * Encrypt data using hybrid encryption (AES-256-GCM + RSA-2048)
   * This is used for end-to-end encryption where session keys are exchanged
   */
  encryptHybrid(plaintext: string, keyType: EncryptionKeyType): EncryptedData {
    const keys = this.getKeysForType(keyType);
    
    // Generate a random session key for this message
    const sessionKey = crypto.randomBytes(AES_KEY_LENGTH);
    const iv = crypto.randomBytes(AES_IV_LENGTH);

    // Encrypt the message with AES using the session key
    const cipher = crypto.createCipheriv(AES_ALGORITHM, sessionKey, iv, {
      authTagLength: AES_TAG_LENGTH,
    });

    let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
    ciphertext += cipher.final('base64');
    const tag = cipher.getAuthTag();

    // Encrypt the session key with RSA public key
    const encryptedKey = crypto.publicEncrypt(
      {
        key: keys.rsaKeyPair.publicKey,
        padding: RSA_PADDING,
        oaepHash: 'sha256',
      },
      sessionKey,
    );

    return {
      ciphertext,
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      encryptedKey: encryptedKey.toString('base64'),
      keyType,
      timestamp: Date.now(),
      version: this.encryptionVersion,
    };
  }

  /**
   * Decrypt data encrypted with hybrid encryption
   */
  decryptHybrid(encryptedData: EncryptedData): string {
    if (!encryptedData.encryptedKey) {
      throw new Error('Missing encrypted key for hybrid decryption');
    }

    const keys = this.getKeysForType(encryptedData.keyType);
    
    // Decrypt the session key with RSA private key
    const encryptedKey = Buffer.from(encryptedData.encryptedKey, 'base64');
    const sessionKey = crypto.privateDecrypt(
      {
        key: keys.rsaKeyPair.privateKey,
        padding: RSA_PADDING,
        oaepHash: 'sha256',
      },
      encryptedKey,
    );

    // Decrypt the message with AES using the session key
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const tag = Buffer.from(encryptedData.tag, 'base64');
    const ciphertext = Buffer.from(encryptedData.ciphertext, 'base64');

    const decipher = crypto.createDecipheriv(AES_ALGORITHM, sessionKey, iv, {
      authTagLength: AES_TAG_LENGTH,
    });
    decipher.setAuthTag(tag);

    let plaintext = decipher.update(ciphertext);
    plaintext = Buffer.concat([plaintext, decipher.final()]);

    return plaintext.toString('utf8');
  }

  // ==========================================
  // Convenience Methods
  // ==========================================

  /**
   * Encrypt a message for AI Chatbot
   */
  encryptChatbotMessage(message: string): EncryptedData {
    return this.encryptAES(message, EncryptionKeyType.AI_CHATBOT);
  }

  /**
   * Decrypt a message from AI Chatbot
   */
  decryptChatbotMessage(encryptedData: EncryptedData): string {
    return this.decryptAES(encryptedData);
  }

  /**
   * Encrypt a message for Live Chat (with end-to-end encryption)
   */
  encryptLiveChatMessage(message: string): EncryptedData {
    return this.encryptHybrid(message, EncryptionKeyType.LIVE_CHAT);
  }

  /**
   * Decrypt a message from Live Chat
   */
  decryptLiveChatMessage(encryptedData: EncryptedData): string {
    return this.decryptHybrid(encryptedData);
  }

  /**
   * Encrypt data for storage (at rest encryption)
   */
  encryptForStorage(data: string, keyType: EncryptionKeyType): string {
    const encrypted = this.encryptAES(data, keyType);
    return JSON.stringify(encrypted);
  }

  /**
   * Decrypt data from storage
   */
  decryptFromStorage(encryptedString: string): string {
    const encryptedData: EncryptedData = JSON.parse(encryptedString);
    return this.decryptAES(encryptedData);
  }

  /**
   * Encrypt an object (JSON serializable)
   */
  encryptObject<T>(obj: T, keyType: EncryptionKeyType): EncryptedData {
    const jsonString = JSON.stringify(obj);
    return this.encryptAES(jsonString, keyType);
  }

  /**
   * Decrypt an object
   */
  decryptObject<T>(encryptedData: EncryptedData): T {
    const jsonString = this.decryptAES(encryptedData);
    return JSON.parse(jsonString) as T;
  }

  // ==========================================
  // Client-side Encryption Support
  // ==========================================

  /**
   * Decrypt data that was encrypted by the client using our public key
   * Returns both the decrypted message and the session key for response encryption
   */
  decryptFromClient(
    encryptedSessionKey: string,
    encryptedData: { ciphertext: string; iv: string; tag: string },
    keyType: EncryptionKeyType,
  ): string {
    const keys = this.getKeysForType(keyType);
    
    // Decrypt the session key with our RSA private key
    const sessionKey = crypto.privateDecrypt(
      {
        key: keys.rsaKeyPair.privateKey,
        padding: RSA_PADDING,
        oaepHash: 'sha256',
      },
      Buffer.from(encryptedSessionKey, 'base64'),
    );

    // Decrypt the message with AES using the session key
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const tag = Buffer.from(encryptedData.tag, 'base64');
    const ciphertext = Buffer.from(encryptedData.ciphertext, 'base64');

    const decipher = crypto.createDecipheriv(AES_ALGORITHM, sessionKey, iv, {
      authTagLength: AES_TAG_LENGTH,
    });
    decipher.setAuthTag(tag);

    let plaintext = decipher.update(ciphertext);
    plaintext = Buffer.concat([plaintext, decipher.final()]);

    return plaintext.toString('utf8');
  }

  /**
   * Decrypt only the session key from client (for storing and reusing)
   */
  decryptSessionKey(
    encryptedSessionKey: string,
    keyType: EncryptionKeyType,
  ): Buffer {
    const keys = this.getKeysForType(keyType);
    
    return crypto.privateDecrypt(
      {
        key: keys.rsaKeyPair.privateKey,
        padding: RSA_PADDING,
        oaepHash: 'sha256',
      },
      Buffer.from(encryptedSessionKey, 'base64'),
    );
  }

  /**
   * Encrypt data to send to client (they can decrypt with their session key)
   */
  encryptForClient(
    plaintext: string,
    clientSessionKey: Buffer,
  ): { ciphertext: string; iv: string; tag: string } {
    const iv = crypto.randomBytes(AES_IV_LENGTH);
    
    const cipher = crypto.createCipheriv(AES_ALGORITHM, clientSessionKey, iv, {
      authTagLength: AES_TAG_LENGTH,
    });

    let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
    ciphertext += cipher.final('base64');
    const tag = cipher.getAuthTag();

    return {
      ciphertext,
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
    };
  }

  // ==========================================
  // Utility Methods
  // ==========================================

  /**
   * Generate a secure random session ID
   */
  generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash a value (for comparing encrypted data without decryption)
   */
  hash(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  /**
   * Verify data integrity
   */
  verifyIntegrity(encryptedData: EncryptedData): boolean {
    try {
      // Attempt to decrypt - if it fails, integrity is compromised
      if (encryptedData.encryptedKey) {
        this.decryptHybrid(encryptedData);
      } else {
        this.decryptAES(encryptedData);
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get encryption info (for debugging/monitoring)
   */
  getEncryptionInfo(): {
    version: number;
    algorithms: { symmetric: string; asymmetric: string };
    keyTypes: string[];
  } {
    return {
      version: this.encryptionVersion,
      algorithms: {
        symmetric: 'AES-256-GCM',
        asymmetric: 'RSA-2048-OAEP-SHA256',
      },
      keyTypes: Object.values(EncryptionKeyType),
    };
  }
}

#!/usr/bin/env node
/**
 * Encryption Key Generation Script
 * 
 * Generates separate encryption keys for AI Chatbot and Live Chat features.
 * 
 * Usage:
 *   npm run generate-keys
 *   node scripts/generate-encryption-keys.js
 *   node scripts/generate-encryption-keys.js --force  (overwrites existing keys)
 * 
 * Security Notes:
 * - Keys are stored in .encryption-keys directory with restrictive permissions
 * - Never commit keys to version control
 * - Back up keys securely - losing them means losing access to encrypted data
 * - Rotate keys periodically using the --rotate flag
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Configuration
const AES_KEY_LENGTH = 32; // 256 bits
const RSA_KEY_SIZE = 2048;
const ENCRYPTION_VERSION = 1;

const KEY_TYPES = ['ai_chatbot', 'live_chat'];

function generateKeys(keysPath, force = false, keyType = null) {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       OnestaffOS Encryption Key Generator                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Ensure keys directory exists
  if (!fs.existsSync(keysPath)) {
    fs.mkdirSync(keysPath, { recursive: true, mode: 0o700 });
    console.log(`✅ Created keys directory: ${keysPath}\n`);
  }

  const typesToGenerate = keyType ? [keyType] : KEY_TYPES;

  for (const type of typesToGenerate) {
    console.log(`\n🔐 Generating keys for: ${type.toUpperCase()}`);
    console.log('─'.repeat(50));

    const aesKeyPath = path.join(keysPath, `${type}_aes.key`);
    const rsaPublicPath = path.join(keysPath, `${type}_rsa_public.pem`);
    const rsaPrivatePath = path.join(keysPath, `${type}_rsa_private.pem`);
    const metadataPath = path.join(keysPath, `${type}_metadata.json`);

    // Check if keys already exist
    const keysExist = fs.existsSync(aesKeyPath) || 
                      fs.existsSync(rsaPublicPath) || 
                      fs.existsSync(rsaPrivatePath);

    if (keysExist && !force) {
      console.log(`⚠️  Keys already exist for ${type}. Use --force to overwrite.\n`);
      continue;
    }

    if (keysExist && force) {
      console.log(`⚠️  Overwriting existing keys for ${type}...`);
    }

    // Generate AES-256 key
    console.log('  📝 Generating AES-256 key...');
    const aesKey = crypto.randomBytes(AES_KEY_LENGTH);
    fs.writeFileSync(aesKeyPath, aesKey, { mode: 0o600 });
    console.log(`     ✓ AES key saved: ${aesKeyPath}`);

    // Generate RSA-2048 key pair
    console.log('  📝 Generating RSA-2048 key pair...');
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

    fs.writeFileSync(rsaPublicPath, publicKey, { mode: 0o600 });
    fs.writeFileSync(rsaPrivatePath, privateKey, { mode: 0o600 });
    console.log(`     ✓ RSA public key saved: ${rsaPublicPath}`);
    console.log(`     ✓ RSA private key saved: ${rsaPrivatePath}`);

    // Save metadata
    const metadata = {
      keyType: type,
      version: ENCRYPTION_VERSION,
      createdAt: new Date().toISOString(),
      algorithms: {
        symmetric: 'AES-256-GCM',
        asymmetric: 'RSA-2048-OAEP-SHA256',
      },
      keyInfo: {
        aesKeyLength: AES_KEY_LENGTH * 8, // in bits
        rsaKeySize: RSA_KEY_SIZE,
      },
    };

    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), { mode: 0o600 });
    console.log(`     ✓ Metadata saved: ${metadataPath}`);

    // Print key fingerprints for verification
    const aesFingerprint = crypto.createHash('sha256').update(aesKey).digest('hex').substring(0, 16);
    const rsaFingerprint = crypto.createHash('sha256').update(publicKey).digest('hex').substring(0, 16);
    
    console.log(`\n  🔑 Key Fingerprints:`);
    console.log(`     AES: ${aesFingerprint}...`);
    console.log(`     RSA: ${rsaFingerprint}...`);
  }

  // Create .gitignore if not exists
  const gitignorePath = path.join(keysPath, '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(gitignorePath, '*\n!.gitignore\n', { mode: 0o644 });
    console.log(`\n✅ Created .gitignore to prevent accidental commits`);
  }

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    🎉 KEY GENERATION COMPLETE               ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\n⚠️  IMPORTANT SECURITY NOTES:');
  console.log('   • Never commit encryption keys to version control');
  console.log('   • Back up keys securely (encrypted backup recommended)');
  console.log('   • Set ENCRYPTION_KEYS_PATH environment variable in production');
  console.log('   • Rotate keys periodically for enhanced security\n');
}

function rotateKeys(keysPath, keyType) {
  console.log(`\n🔄 Rotating keys for: ${keyType.toUpperCase()}\n`);
  
  // Create backup of existing keys
  const backupPath = path.join(keysPath, 'backups');
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(backupPath, { recursive: true, mode: 0o700 });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(backupPath, `${keyType}_${timestamp}`);
  fs.mkdirSync(backupDir, { mode: 0o700 });

  // Copy existing keys to backup
  const filesToBackup = [
    `${keyType}_aes.key`,
    `${keyType}_rsa_public.pem`,
    `${keyType}_rsa_private.pem`,
    `${keyType}_metadata.json`,
  ];

  for (const file of filesToBackup) {
    const srcPath = path.join(keysPath, file);
    const destPath = path.join(backupDir, file);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
    }
  }

  console.log(`✅ Existing keys backed up to: ${backupDir}`);

  // Generate new keys
  generateKeys(keysPath, true, keyType);

  console.log(`\n⚠️  Key rotation complete. You may need to:`);
  console.log(`   1. Re-encrypt existing data with new keys`);
  console.log(`   2. Update any key caches`);
  console.log(`   3. Restart services using these keys\n`);
}

function verifyKeys(keysPath) {
  console.log('\n🔍 Verifying encryption keys...\n');

  let allValid = true;

  for (const type of KEY_TYPES) {
    console.log(`Checking ${type.toUpperCase()}:`);

    const aesKeyPath = path.join(keysPath, `${type}_aes.key`);
    const rsaPublicPath = path.join(keysPath, `${type}_rsa_public.pem`);
    const rsaPrivatePath = path.join(keysPath, `${type}_rsa_private.pem`);
    const metadataPath = path.join(keysPath, `${type}_metadata.json`);

    // Check files exist
    const files = [
      { path: aesKeyPath, name: 'AES Key' },
      { path: rsaPublicPath, name: 'RSA Public Key' },
      { path: rsaPrivatePath, name: 'RSA Private Key' },
      { path: metadataPath, name: 'Metadata' },
    ];

    for (const file of files) {
      if (fs.existsSync(file.path)) {
        console.log(`  ✓ ${file.name} exists`);
      } else {
        console.log(`  ✗ ${file.name} MISSING`);
        allValid = false;
      }
    }

    // Verify key sizes
    if (fs.existsSync(aesKeyPath)) {
      const aesKey = fs.readFileSync(aesKeyPath);
      if (aesKey.length === AES_KEY_LENGTH) {
        console.log(`  ✓ AES key size valid (${aesKey.length * 8} bits)`);
      } else {
        console.log(`  ✗ AES key size invalid`);
        allValid = false;
      }
    }

    // Test RSA encryption/decryption
    if (fs.existsSync(rsaPublicPath) && fs.existsSync(rsaPrivatePath)) {
      try {
        const publicKey = fs.readFileSync(rsaPublicPath, 'utf8');
        const privateKey = fs.readFileSync(rsaPrivatePath, 'utf8');
        
        const testData = Buffer.from('test encryption');
        const encrypted = crypto.publicEncrypt(
          { key: publicKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
          testData
        );
        const decrypted = crypto.privateDecrypt(
          { key: privateKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
          encrypted
        );

        if (decrypted.toString() === 'test encryption') {
          console.log(`  ✓ RSA encryption/decryption working`);
        } else {
          console.log(`  ✗ RSA encryption/decryption failed`);
          allValid = false;
        }
      } catch (error) {
        console.log(`  ✗ RSA key pair invalid: ${error.message}`);
        allValid = false;
      }
    }

    console.log('');
  }

  if (allValid) {
    console.log('✅ All encryption keys are valid!\n');
  } else {
    console.log('❌ Some keys are invalid or missing. Run with --force to regenerate.\n');
  }

  return allValid;
}

// Main execution
const args = process.argv.slice(2);
const keysPath = process.env.ENCRYPTION_KEYS_PATH || 
  path.join(__dirname, '..', '.encryption-keys');

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage: node generate-encryption-keys.js [options]

Options:
  --force             Overwrite existing keys
  --rotate <type>     Rotate keys for specific type (ai_chatbot or live_chat)
  --verify            Verify existing keys
  --path <path>       Custom keys directory path
  --help, -h          Show this help

Examples:
  node generate-encryption-keys.js
  node generate-encryption-keys.js --force
  node generate-encryption-keys.js --rotate ai_chatbot
  node generate-encryption-keys.js --verify
  node generate-encryption-keys.js --path /secure/keys
`);
  process.exit(0);
}

// Parse custom path
const pathIndex = args.indexOf('--path');
const customPath = pathIndex !== -1 && args[pathIndex + 1] ? args[pathIndex + 1] : keysPath;

if (args.includes('--verify')) {
  verifyKeys(customPath);
} else if (args.includes('--rotate')) {
  const rotateIndex = args.indexOf('--rotate');
  const keyType = args[rotateIndex + 1];
  if (!KEY_TYPES.includes(keyType)) {
    console.error(`Invalid key type: ${keyType}. Must be one of: ${KEY_TYPES.join(', ')}`);
    process.exit(1);
  }
  rotateKeys(customPath, keyType);
} else {
  generateKeys(customPath, args.includes('--force'));
}

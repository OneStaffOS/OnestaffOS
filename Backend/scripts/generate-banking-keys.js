#!/usr/bin/env node
/**
 * Banking Transaction Key Generator
 *
 * Generates RSA key pair for signing internal banking transactions.
 *
 * Usage:
 *   node scripts/generate-banking-keys.js
 *   node scripts/generate-banking-keys.js --force
 *   node scripts/generate-banking-keys.js --verify
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const RSA_KEY_SIZE = 2048;
const DEFAULT_KEYS_PATH = path.join(process.cwd(), '.banking-keys');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true, mode: 0o700 });
  }
}

function writeGitignore(dirPath) {
  const gitignorePath = path.join(dirPath, '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(gitignorePath, '*\n!.gitignore\n', { mode: 0o644 });
  }
}

function generateKeys(keysPath, force = false) {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           OneStaff OS Banking Key Generator               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  ensureDir(keysPath);
  writeGitignore(keysPath);

  const privateKeyPath = path.join(keysPath, 'banking_rsa_private.pem');
  const publicKeyPath = path.join(keysPath, 'banking_rsa_public.pem');
  const metadataPath = path.join(keysPath, 'banking_metadata.json');

  const exists = fs.existsSync(privateKeyPath) || fs.existsSync(publicKeyPath);
  if (exists && !force) {
    console.log('⚠️  Banking keys already exist. Use --force to overwrite.');
    return;
  }

  if (exists && force) {
    console.log('⚠️  Overwriting existing banking keys...');
  }

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

  fs.writeFileSync(privateKeyPath, privateKey, { mode: 0o600 });
  fs.writeFileSync(publicKeyPath, publicKey, { mode: 0o600 });

  const metadata = {
    keyType: 'banking_transactions',
    createdAt: new Date().toISOString(),
    algorithm: 'RSA-2048-SHA256',
    publicKeyFingerprint: crypto.createHash('sha256').update(publicKey).digest('hex').slice(0, 16),
  };

  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), { mode: 0o600 });

  console.log(`✅ Banking keys generated in: ${keysPath}`);
  console.log(`   - ${privateKeyPath}`);
  console.log(`   - ${publicKeyPath}`);
  console.log(`   - ${metadataPath}`);
  console.log('\n⚠️  Do not commit these keys to version control.');
  console.log('   Set BANKING_KEYS_PATH in your environment to this folder.');
}

function verifyKeys(keysPath) {
  const privateKeyPath = path.join(keysPath, 'banking_rsa_private.pem');
  const publicKeyPath = path.join(keysPath, 'banking_rsa_public.pem');

  if (fs.existsSync(privateKeyPath) && fs.existsSync(publicKeyPath)) {
    console.log('✅ Banking keys are present.');
    return true;
  }

  console.log('❌ Banking keys are missing.');
  if (!fs.existsSync(privateKeyPath)) {
    console.log(`   Missing: ${privateKeyPath}`);
  }
  if (!fs.existsSync(publicKeyPath)) {
    console.log(`   Missing: ${publicKeyPath}`);
  }
  return false;
}

function main() {
  const args = process.argv.slice(2);
  const keysPath = process.env.BANKING_KEYS_PATH || DEFAULT_KEYS_PATH;

  if (args.includes('--verify')) {
    const ok = verifyKeys(keysPath);
    process.exit(ok ? 0 : 1);
  }

  const force = args.includes('--force');
  generateKeys(keysPath, force);
}

main();

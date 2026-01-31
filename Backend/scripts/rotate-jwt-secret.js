#!/usr/bin/env node

/**
 * JWT Secret Rotation Script
 * 
 * This script rotates the JWT_SECRET in the .env file every 24 hours.
 * It generates a cryptographically strong pseudo-random secret and updates
 * the .env file in-place while preserving other environment variables.
 * 
 * Usage:
 *   node scripts/rotate-jwt-secret.js
 * 
 * Cron (every 24 hours at 2 AM):
 *   0 2 * * * cd /path/to/Backend && node scripts/rotate-jwt-secret.js >> logs/jwt-rotation.log 2>&1
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration
const ENV_FILE_PATH = path.join(__dirname, '..', '.env');
const LOG_FILE_PATH = path.join(__dirname, '..', 'logs', 'jwt-rotation.log');
const ROTATION_HISTORY_DIR = path.join(__dirname, '..', 'rotation-history');
const SECRET_LENGTH = 128; // 128 hex characters = 64 bytes = 512 bits

/**
 * Generate a cryptographically strong pseudo-random JWT secret
 * @returns {string} Hex-encoded random secret
 */
function generateJwtSecret() {
  return crypto.randomBytes(SECRET_LENGTH / 2).toString('hex');
}

/**
 * Log messages with timestamp
 * @param {string} message - Log message
 */
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  
  // Console output
  console.log(logMessage.trim());
  
  // File output
  try {
    const logDir = path.dirname(LOG_FILE_PATH);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    fs.appendFileSync(LOG_FILE_PATH, logMessage);
  } catch (error) {
    console.error(`Failed to write to log file: ${error.message}`);
  }
}

/**
 * Rotate JWT secret in .env file with dual-key grace period
 * This maintains both old and new secrets to prevent breaking active sessions
 */
function rotateJwtSecret() {
  try {
    log('Starting JWT secret rotation with dual-key grace period...');
    
    // Check if .env file exists
    if (!fs.existsSync(ENV_FILE_PATH)) {
      throw new Error(`.env file not found at ${ENV_FILE_PATH}`);
    }
    
    // Read current .env file
    const envContent = fs.readFileSync(ENV_FILE_PATH, 'utf8');
    log('Read .env file successfully');
    
    // Extract current JWT_SECRET (will become JWT_SECRET_OLD)
    const currentSecretMatch = envContent.match(/^JWT_SECRET=(.*)$/m);
    if (!currentSecretMatch) {
      throw new Error('JWT_SECRET not found in .env file');
    }
    const currentSecret = currentSecretMatch[1];
    log(`Current JWT_SECRET extracted (length: ${currentSecret.length} characters)`);
    
    // Generate new JWT secret
    const newSecret = generateJwtSecret();
    log(`Generated new JWT_SECRET (length: ${newSecret.length} characters)`);
    
    // Save rotation history (old and new secrets only)
    saveRotationHistory(currentSecret, newSecret);
    
    // Dual-key rotation strategy:
    // 1. Move current JWT_SECRET to JWT_SECRET_OLD
    // 2. Set new JWT_SECRET
    // This allows verification of tokens signed with either key during grace period
    
    let updatedContent = envContent;
    
    // Update or add JWT_SECRET_OLD with the current secret
    if (envContent.match(/^JWT_SECRET_OLD=.*/m)) {
      updatedContent = updatedContent.replace(
        /^JWT_SECRET_OLD=.*/m,
        `JWT_SECRET_OLD=${currentSecret}`
      );
      log('Updated JWT_SECRET_OLD with previous secret');
    } else {
      // Add JWT_SECRET_OLD after JWT_SECRET line
      updatedContent = updatedContent.replace(
        /^JWT_SECRET=.*/m,
        `JWT_SECRET=${currentSecret}\nJWT_SECRET_OLD=${currentSecret}`
      );
      log('Added JWT_SECRET_OLD (first rotation)');
    }
    
    // Now update JWT_SECRET with the new secret
    updatedContent = updatedContent.replace(
      /^JWT_SECRET=.*/m,
      `JWT_SECRET=${newSecret}`
    );
    log('Updated JWT_SECRET with new secret');
    
    // Write updated content to .env file
    fs.writeFileSync(ENV_FILE_PATH, updatedContent);
    log('✅ JWT secret rotated successfully!');
    log('📝 Active sessions will remain valid during 24-hour grace period');
    log('📝 New logins will use the new JWT_SECRET');
    log('📝 Token verification will accept both JWT_SECRET and JWT_SECRET_OLD');
    
    return true;
  } catch (error) {
    log(`❌ Error rotating JWT secret: ${error.message}`);
    console.error(error);
    return false;
  }
}

/**
 * Save rotation history to file (only old and new secrets)
 * @param {string} oldSecret - Previous JWT secret
 * @param {string} newSecret - New JWT secret
 */
function saveRotationHistory(oldSecret, newSecret) {
  try {
    // Create rotation-history directory if it doesn't exist
    if (!fs.existsSync(ROTATION_HISTORY_DIR)) {
      fs.mkdirSync(ROTATION_HISTORY_DIR, { recursive: true });
    }
    
    const timestamp = Date.now();
    const dateStr = new Date(timestamp).toISOString();
    const historyFile = path.join(ROTATION_HISTORY_DIR, `rotation-${timestamp}.txt`);
    
    const historyContent = `JWT Secret Rotation History
========================================
Rotation Date: ${dateStr}
Timestamp: ${timestamp}

OLD JWT_SECRET:
${oldSecret}

NEW JWT_SECRET:
${newSecret}

Note: The old secret remains valid for 24 hours as JWT_SECRET_OLD
========================================
`;
    
    fs.writeFileSync(historyFile, historyContent);
    log(`Saved rotation history to ${path.basename(historyFile)}`);
    
    // Clean up old history files (keep only last 10)
    cleanupOldHistory();
  } catch (error) {
    log(`Warning: Failed to save rotation history: ${error.message}`);
  }
}

/**
 * Clean up old rotation history files, keeping only the most recent 10
 */
function cleanupOldHistory() {
  try {
    if (!fs.existsSync(ROTATION_HISTORY_DIR)) {
      return;
    }
    
    const files = fs.readdirSync(ROTATION_HISTORY_DIR);
    
    // Filter rotation history files
    const historyFiles = files
      .filter(file => file.startsWith('rotation-') && file.endsWith('.txt'))
      .map(file => ({
        name: file,
        path: path.join(ROTATION_HISTORY_DIR, file),
        timestamp: parseInt(file.replace('rotation-', '').replace('.txt', ''), 10)
      }))
      .sort((a, b) => b.timestamp - a.timestamp);
    
    // Remove old history files (keep only 10 most recent)
    const filesToDelete = historyFiles.slice(10);
    filesToDelete.forEach(file => {
      fs.unlinkSync(file.path);
      log(`Deleted old rotation history: ${file.name}`);
    });
    
    if (filesToDelete.length > 0) {
      log(`Cleaned up ${filesToDelete.length} old rotation history file(s)`);
    }
  } catch (error) {
    log(`Warning: Failed to clean up old rotation history: ${error.message}`);
  }
}

/**
 * Schedule rotation to run every 24 hours
 */
function scheduleRotation() {
  log('JWT secret rotation scheduler started');
  log('Rotation will occur every 24 hours');
  
  // Run immediately on startup
  rotateJwtSecret();
  
  // Schedule to run every 24 hours (86400000 milliseconds)
  setInterval(() => {
    rotateJwtSecret();
  }, 24 * 60 * 60 * 1000);
}

// Check if running as main module
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--schedule')) {
    // Run in scheduled mode (keeps process alive)
    scheduleRotation();
  } else if (args.includes('--help') || args.includes('-h')) {
    console.log(`
JWT Secret Rotation Script

Usage:
  node rotate-jwt-secret.js           Run once and exit
  node rotate-jwt-secret.js --schedule Run as scheduler (every 24h)
  node rotate-jwt-secret.js --help     Show this help message

Options:
  --schedule   Keep process alive and rotate every 24 hours
  --help, -h   Show help message
    `);
  } else {
    // Run once and exit
    const success = rotateJwtSecret();
    process.exit(success ? 0 : 1);
  }
}

module.exports = { rotateJwtSecret, generateJwtSecret };

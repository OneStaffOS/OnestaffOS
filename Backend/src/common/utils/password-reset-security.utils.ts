import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import * as otpGenerator from 'otp-generator';

/**
 * Password reset security utilities
 * Handles OTP generation, token generation, and hashing
 */

const SALT_ROUNDS = 10;

/**
 * Generate a cryptographically secure 8-digit numeric OTP
 * Uses otp-generator for pseudo-random generation
 * 
 * SECURITY NOTES:
 * - OTP is generated using crypto-random algorithms
 * - OTP is NEVER logged or exposed in API responses
 * - OTP is transmitted ONLY via secure email
 * - OTP is stored as bcrypt hash in database
 * - OTP expires after 10 minutes
 * - OTP is single-use (deleted after successful verification)
 * 
 * @returns 8-digit numeric OTP as string
 */
export function generateOtp(): string {
  return otpGenerator.generate(8, {
    digits: true,
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false,
  });
}

/**
 * Hash OTP using bcrypt before storing in database
 * @param otp - Plain text OTP
 * @returns Hashed OTP
 */
export async function hashOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, SALT_ROUNDS);
}

/**
 * Verify OTP against hashed version
 * @param plainOtp - Plain text OTP provided by user
 * @param hashedOtp - Hashed OTP from database
 * @returns true if OTP matches, false otherwise
 */
export async function verifyOtp(
  plainOtp: string,
  hashedOtp: string,
): Promise<boolean> {
  return bcrypt.compare(plainOtp, hashedOtp);
}

/**
 * Generate a cryptographically secure reset token
 * Uses crypto.randomBytes for unpredictable token generation
 * @returns Object containing plain token (to return to user) and hashed token (to store in DB)
 */
export function generateResetToken(): {
  token: string;
  hashedToken: string;
} {
  // Generate 32 random bytes, convert to hex (64 characters)
  const token = crypto.randomBytes(32).toString('hex');

  // Hash the token using SHA-256 before storing
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  return { token, hashedToken };
}

/**
 * Hash a reset token using SHA-256
 * Used when verifying a token provided by user
 * @param token - Plain text token
 * @returns Hashed token
 */
export function hashResetToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Calculate OTP expiry timestamp (10 minutes from now)
 * @returns Date object representing expiry time
 */
export function calculateOtpExpiry(): Date {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + 10); // OTP expires in 10 minutes
  return expiry;
}

/**
 * Calculate reset token expiry timestamp (15 minutes from now)
 * @returns Date object representing expiry time
 */
export function calculateTokenExpiry(): Date {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + 15); // Token expires in 15 minutes
  return expiry;
}

/**
 * Check if a timestamp has expired
 * @param expiryDate - Date to check
 * @returns true if expired, false otherwise
 */
export function isExpired(expiryDate: Date): boolean {
  return new Date() > expiryDate;
}

/**
 * Validate password strength
 * Must contain: uppercase, lowercase, number, special character
 * Minimum 8 characters
 * @param password - Password to validate
 * @returns Object with isValid boolean and error message if invalid
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  message?: string;
} {
  if (!password || password.length === 0) {
    return {
      isValid: false,
      message: 'Password is required',
    };
  }

  if (password.length < 8) {
    return {
      isValid: false,
      message: 'Password must be at least 8 characters long',
    };
  }

  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[@$!%*?&]/.test(password);

  const missingRequirements: string[] = [];
  if (!hasUppercase) missingRequirements.push('one uppercase letter (A-Z)');
  if (!hasLowercase) missingRequirements.push('one lowercase letter (a-z)');
  if (!hasNumber) missingRequirements.push('one number (0-9)');
  if (!hasSpecialChar) missingRequirements.push('one special character (@$!%*?&)');

  if (missingRequirements.length > 0) {
    return {
      isValid: false,
      message: `Password must contain at least ${missingRequirements.join(', ')}`,
    };
  }

  return { isValid: true };
}

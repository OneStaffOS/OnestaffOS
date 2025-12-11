/**
 * Security Utilities
 * Provides functions for input sanitization, validation, and security checks
 */

import { BadRequestException } from '@nestjs/common';

/**
 * Sanitize string input to prevent XSS attacks
 * Removes potentially dangerous HTML/JavaScript
 */
export function sanitizeString(input: string): string {
  if (!input) return input;

  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframe tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers (onclick, onload, etc.)
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '') // Remove embed tags
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '') // Remove object tags
    .trim();
}

/**
 * Sanitize HTML content while preserving safe tags
 */
export function sanitizeHTML(input: string, allowedTags: string[] = []): string {
  if (!input) return input;

  const allowedTagsPattern = allowedTags.length
    ? allowedTags.join('|')
    : 'p|br|strong|em|u|a|ul|ol|li|h1|h2|h3|h4|h5|h6';

  // Remove all tags except allowed ones
  const regex = new RegExp(`<(?!\\/?(${allowedTagsPattern})\\b)[^>]+>`, 'gi');
  return input.replace(regex, '');
}

/**
 * Validate and sanitize file paths to prevent directory traversal
 */
export function sanitizeFilePath(filePath: string): string {
  if (!filePath) return filePath;

  // Remove path traversal attempts
  return filePath
    .replace(/\.\./g, '') // Remove ..
    .replace(/\\/g, '/') // Normalize path separators
    .replace(/\/+/g, '/') // Remove multiple slashes
    .replace(/^\//, ''); // Remove leading slash
}

/**
 * Validate URL to prevent SSRF attacks
 */
export function validateURL(url: string, allowedDomains?: string[]): boolean {
  try {
    const parsedUrl = new URL(url);

    // Block private/local IPs
    const hostname = parsedUrl.hostname.toLowerCase();
    const privateIPPatterns = [
      /^localhost$/,
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2\d|3[01])\./,
      /^192\.168\./,
      /^169\.254\./, // Link-local
      /^::1$/, // IPv6 localhost
      /^fe80:/, // IPv6 link-local
    ];

    for (const pattern of privateIPPatterns) {
      if (pattern.test(hostname)) {
        return false;
      }
    }

    // Check allowed domains if specified
    if (allowedDomains && allowedDomains.length > 0) {
      const isAllowed = allowedDomains.some((domain) =>
        hostname.endsWith(domain.toLowerCase()),
      );
      if (!isAllowed) {
        return false;
      }
    }

    // Only allow HTTP/HTTPS protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitize command-line arguments to prevent OS command injection
 */
export function sanitizeCommandArg(arg: string): string {
  if (!arg) return arg;

  // Remove shell metacharacters
  return arg.replace(/[;&|`$()<>]/g, '');
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(
  password: string,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate secure random token
 */
export function generateSecureToken(length: number = 32): string {
  const crypto = require('crypto');
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash sensitive data (one-way)
 */
export function hashData(data: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
export function secureCompare(a: string, b: string): boolean {
  const crypto = require('crypto');
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);

  if (bufferA.length !== bufferB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufferA, bufferB);
}

/**
 * Sanitize object recursively to prevent NoSQL injection
 */
export function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const sanitized: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      // Remove keys starting with $ (MongoDB operators)
      if (key.startsWith('$')) {
        console.warn(`[SECURITY] Blocked NoSQL operator in key: ${key}`);
        continue;
      }
      sanitized[key] = sanitizeObject(obj[key]);
    }
  }
  return sanitized;
}

/**
 * Validate file upload
 */
export function validateFileUpload(
  file: Express.Multer.File,
  options: {
    maxSize?: number; // in bytes
    allowedMimeTypes?: string[];
    allowedExtensions?: string[];
  } = {},
): void {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedMimeTypes = [],
    allowedExtensions = [],
  } = options;

  if (!file) {
    throw new BadRequestException('No file provided');
  }

  // Check file size
  if (file.size > maxSize) {
    throw new BadRequestException(
      `File size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB`,
    );
  }

  // Check MIME type
  if (allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(file.mimetype)) {
    throw new BadRequestException(`File type ${file.mimetype} is not allowed`);
  }

  // Check file extension
  if (allowedExtensions.length > 0) {
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (!ext || !allowedExtensions.includes(ext)) {
      throw new BadRequestException(`File extension .${ext} is not allowed`);
    }
  }

  // Check for null bytes in filename (security issue)
  if (file.originalname.includes('\0')) {
    throw new BadRequestException('Invalid file name');
  }
}

/**
 * Rate limit key generator for user-specific rate limiting
 */
export function getRateLimitKey(userId?: string, ip?: string): string {
  return userId ? `user:${userId}` : `ip:${ip}`;
}

/**
 * Log security event
 */
export function logSecurityEvent(
  event: string,
  details: any,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
): void {
  const timestamp = new Date().toISOString();
  console.warn(
    `[SECURITY ${severity.toUpperCase()}] ${timestamp} - ${event}:`,
    JSON.stringify(details),
  );
  
  // In production, you should send this to a security monitoring service
  // like Sentry, DataDog, or a dedicated SIEM
}

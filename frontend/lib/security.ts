/**
 * Frontend Security Utilities
 * XSS Prevention, Input Sanitization, and CSRF Token Management
 */

/**
 * Sanitize user input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize HTML content - strips all HTML tags except allowed ones
 */
export function sanitizeHTML(
  html: string,
  allowedTags: string[] = ['b', 'i', 'em', 'strong', 'p', 'br']
): string {
  if (!html) return '';

  // Create a temporary div to parse HTML
  const temp = document.createElement('div');
  temp.textContent = html;
  let sanitized = temp.innerHTML;

  // Remove all tags except allowed ones
  const tagRegex = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
  sanitized = sanitized.replace(tagRegex, (match, tag) => {
    return allowedTags.includes(tag.toLowerCase()) ? match : '';
  });

  return sanitized;
}

/**
 * Validate URL to prevent SSRF and open redirect attacks
 */
export function isValidURL(url: string): boolean {
  try {
    const parsed = new URL(url);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }

    // Block localhost and private IP ranges
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Get CSRF token from cookies
 */
export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;

  const matches = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return matches ? decodeURIComponent(matches[1]) : null;
}

/**
 * Set CSRF token in cookies
 */
export function setCsrfToken(token: string): void {
  if (typeof document === 'undefined') return;

  const secure = window.location.protocol === 'https:';
  document.cookie = `XSRF-TOKEN=${encodeURIComponent(token)}; path=/; ${secure ? 'secure;' : ''} samesite=strict`;
}

/**
 * Add CSRF token to request headers
 */
export function addCsrfTokenToHeaders(headers: HeadersInit = {}): HeadersInit {
  const token = getCsrfToken();
  if (token) {
    return {
      ...headers,
      'X-CSRF-TOKEN': token,
    };
  }
  return headers;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * Requires: min 8 chars, uppercase, lowercase, number, special char
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
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
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize file name to prevent directory traversal
 */
export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/\.\./g, '')
    .replace(/[/\\]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Validate file upload
 */
export function validateFileUpload(
  file: File,
  options: {
    maxSize?: number; // in bytes
    allowedTypes?: string[];
    allowedExtensions?: string[];
  } = {}
): { isValid: boolean; error?: string } {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf'],
  } = options;

  // Check file size
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `File size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB`,
    };
  }

  // Check MIME type
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `File type ${file.type} is not allowed`,
    };
  }

  // Check file extension
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!allowedExtensions.includes(extension)) {
    return {
      isValid: false,
      error: `File extension ${extension} is not allowed`,
    };
  }

  return { isValid: true };
}

/**
 * Prevent clickjacking by checking if page is in iframe
 */
export function preventClickjacking(): void {
  if (typeof window === 'undefined') return;

  if (window.self !== window.top) {
    // Page is in an iframe - break out or hide content
    window.top!.location.href = window.self.location.href;
  }
}

/**
 * Log security events
 */
export function logSecurityEvent(
  event: string,
  details?: Record<string, any>
): void {
  if (typeof console !== 'undefined') {
    console.warn('[SECURITY]', event, details);
  }

  // In production, you might want to send this to a logging service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Send to logging service
    // Example: sendToLoggingService({ event, details, timestamp: new Date() });
  }
}

/**
 * Secure storage wrapper (prevents XSS via localStorage)
 */
export const secureStorage = {
  setItem(key: string, value: any): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const sanitizedValue = typeof value === 'string' ? sanitizeInput(value) : value;
      localStorage.setItem(key, JSON.stringify(sanitizedValue));
    } catch (error) {
      logSecurityEvent('Storage error', { key, error });
    }
  },

  getItem(key: string): any {
    if (typeof localStorage === 'undefined') return null;
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      logSecurityEvent('Storage retrieval error', { key, error });
      return null;
    }
  },

  removeItem(key: string): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(key);
  },
};

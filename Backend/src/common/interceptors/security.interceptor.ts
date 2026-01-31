import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { logSecurityEvent } from '../utils/security.utils';

/**
 * Security Interceptor
 * Adds security headers, sanitizes responses, and logs security events
 */
@Injectable()
export class SecurityInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Add security headers to response
    this.addSecurityHeaders(response);

    // Log suspicious activity
    this.logSuspiciousActivity(request);

    return next.handle().pipe(
      map((data) => {
        // Skip sanitization for auth endpoints that need to return tokens
        const isAuthEndpoint = request.url?.includes('/auth/login') || 
                               request.url?.includes('/auth/register') ||
                               request.url?.includes('/auth/refresh');
        
        if (isAuthEndpoint) {
          return data; // Return data as-is for auth endpoints
        }
        
        // Sanitize sensitive data in response for other endpoints
        return this.sanitizeResponse(data);
      }),
    );
  }

  private addSecurityHeaders(response: any): void {
    // Prevent MIME type sniffing
    response.setHeader('X-Content-Type-Options', 'nosniff');

    // Prevent clickjacking
    response.setHeader('X-Frame-Options', 'DENY');

    // Enable XSS protection in older browsers
    response.setHeader('X-XSS-Protection', '1; mode=block');

    // Control referrer information
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Prevent browsers from caching sensitive data
    response.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, private',
    );
    response.setHeader('Pragma', 'no-cache');
    response.setHeader('Expires', '0');

    // Permissions Policy (formerly Feature Policy)
    response.setHeader(
      'Permissions-Policy',
      'geolocation=(), microphone=(), camera=()',
    );
  }

  private logSuspiciousActivity(request: any): void {
    const suspiciousPatterns = [
      /\.\.\//g, // Directory traversal
      /<script/gi, // Script injection
      /union.*select/gi, // SQL injection
      /javascript:/gi, // JavaScript protocol
      /eval\(/gi, // Code execution
      /exec\(/gi, // Code execution
    ];

    const checkPaths = [
      request.url,
      request.query ? JSON.stringify(request.query) : '',
      request.body ? JSON.stringify(request.body) : '',
    ];

    for (const path of checkPaths) {
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(path)) {
          logSecurityEvent(
            'Suspicious pattern detected',
            {
              pattern: pattern.toString(),
              url: request.url,
              method: request.method,
              ip: request.ip,
              userAgent: request.headers['user-agent'],
            },
            'high',
          );
          break;
        }
      }
    }
  }

  private sanitizeResponse(data: any, visited = new WeakSet()): any {
    if (!data) return data;

    // Don't sanitize primitive types
    if (typeof data !== 'object') return data;

    // Prevent circular references
    if (visited.has(data)) {
      return undefined; // Skip circular refs instead of marking them
    }
    visited.add(data);

    // Convert Mongoose documents to plain objects FIRST
    if (data.toJSON && typeof data.toJSON === 'function') {
      try {
        data = data.toJSON();
      } catch (e) {
        // If toJSON fails, try toObject
        if (data.toObject && typeof data.toObject === 'function') {
          data = data.toObject();
        }
      }
    } else if (data.toObject && typeof data.toObject === 'function') {
      try {
        data = data.toObject();
      } catch (e) {
        // Ignore errors
      }
    }

    // Handle Date objects
    if (data instanceof Date) {
      return data.toISOString();
    }

    // Handle arrays
    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeResponse(item, visited)).filter(item => item !== undefined);
    }

    // Handle objects
    const sanitized: any = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        // Skip Mongoose internal properties (but keep _id)
        if ((key.startsWith('$') || key.startsWith('__')) || (key.startsWith('_') && key !== '_id')) {
          continue;
        }

        // Skip sensitive fields in response
        if (this.isSensitiveField(key)) {
          continue;
        }

        // Recursively sanitize nested objects
        const sanitizedValue = this.sanitizeResponse(data[key], visited);
        if (sanitizedValue !== undefined) {
          sanitized[key] = sanitizedValue;
        }
      }
    }

    return sanitized;
  }

  private isSensitiveField(fieldName: string): boolean {
    const sensitiveFields = [
      'password',
      'passwordHash',
      'salt',
      'secret',
      'token',
      'apiKey',
      'privateKey',
      'accessToken',
      'refreshToken',
      'otp',
      'resetOtpHash',
      'passwordResetTokenHash',
      'resetOtpExpiresAt',
      'passwordResetExpiresAt',
    ];

    return sensitiveFields.some((field) =>
      fieldName.toLowerCase().includes(field.toLowerCase()),
    );
  }
}

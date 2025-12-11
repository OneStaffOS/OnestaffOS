import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { sanitizeObject, logSecurityEvent } from '../utils/security.utils';

/**
 * NoSQL Injection Sanitization Middleware
 * Sanitizes request body, query, and params to prevent NoSQL injection
 * Compatible with NestJS request handling
 */
@Injectable()
export class NoSQLSanitizeMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    try {
      // Sanitize request body
      if (req.body && typeof req.body === 'object') {
        const originalBody = JSON.stringify(req.body);
        req.body = sanitizeObject(req.body);
        const sanitizedBody = JSON.stringify(req.body);
        
        if (originalBody !== sanitizedBody) {
          logSecurityEvent(
            'NoSQL injection attempt detected in request body',
            {
              url: req.url,
              method: req.method,
              ip: req.ip,
            },
            'high',
          );
        }
      }

      // Sanitize query parameters (create new object instead of modifying)
      if (req.query && Object.keys(req.query).length > 0) {
        const originalQuery = JSON.stringify(req.query);
        const sanitizedQuery = sanitizeObject({ ...req.query });
        
        if (originalQuery !== JSON.stringify(sanitizedQuery)) {
          logSecurityEvent(
            'NoSQL injection attempt detected in query parameters',
            {
              url: req.url,
              method: req.method,
              ip: req.ip,
            },
            'high',
          );
        }
        
        // Replace query with sanitized version
        Object.keys(req.query).forEach((key) => delete req.query[key]);
        Object.assign(req.query, sanitizedQuery);
      }

      // Sanitize URL parameters
      if (req.params && typeof req.params === 'object') {
        const originalParams = JSON.stringify(req.params);
        req.params = sanitizeObject(req.params);
        const sanitizedParams = JSON.stringify(req.params);
        
        if (originalParams !== sanitizedParams) {
          logSecurityEvent(
            'NoSQL injection attempt detected in URL parameters',
            {
              url: req.url,
              method: req.method,
              ip: req.ip,
            },
            'high',
          );
        }
      }

      next();
    } catch (error) {
      logSecurityEvent(
        'Error in NoSQL sanitization middleware',
        {
          error: error.message,
          url: req.url,
          method: req.method,
        },
        'medium',
      );
      next();
    }
  }
}

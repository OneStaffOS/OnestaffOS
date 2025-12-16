/**
 * Correlation ID Middleware
 * Adds a unique correlation ID to each request for tracing and debugging
 * The ID is propagated to all logs and can be included in error responses
 */

import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

// Extend Express Request to include correlationId
declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    // Check for existing correlation ID from client or upstream service
    const existingId = 
      req.headers['x-correlation-id'] as string ||
      req.headers['x-request-id'] as string;

    // Generate new ID if not present
    const correlationId = existingId || this.generateCorrelationId();

    // Attach to request
    req.correlationId = correlationId;

    // Add to response headers for client-side debugging
    res.setHeader('X-Correlation-ID', correlationId);

    // Log incoming request with correlation ID
    const startTime = Date.now();
    
    this.logger.log(
      `[${correlationId}] --> ${req.method} ${req.originalUrl} (IP: ${req.ip || 'unknown'})`
    );

    // Log response when finished
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;
      const statusEmoji = statusCode >= 500 ? '❌' : statusCode >= 400 ? '⚠️' : '✅';
      
      this.logger.log(
        `[${correlationId}] <-- ${statusEmoji} ${req.method} ${req.originalUrl} ${statusCode} (${duration}ms)`
      );
    });

    next();
  }

  private generateCorrelationId(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 9);
    return `req_${timestamp}_${randomPart}`;
  }
}

/**
 * Helper function to get correlation ID from request
 * Can be used in services/controllers for logging
 */
export function getCorrelationId(req: Request): string {
  return req.correlationId || 'unknown';
}

/**
 * Request ID Middleware
 * 
 * Generates or extracts request IDs for distributed tracing.
 * Attaches the ID to the request context and response headers.
 */

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Extend Express Request type to include requestId
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // Check for existing request ID in headers (case-insensitive)
    const existingId = 
      req.headers['x-request-id'] || 
      req.headers['X-Request-ID'] ||
      req.headers['x-correlation-id'];

    // Use existing or generate new UUID
    const requestId = (typeof existingId === 'string' ? existingId : uuidv4()).substring(0, 36);

    // Attach to request object
    req.requestId = requestId;

    // Add to response headers for client correlation
    res.setHeader('X-Request-ID', requestId);

    next();
  }
}

/**
 * HTTP Logging Interceptor
 * 
 * Logs all HTTP requests with timing, status codes, and request IDs.
 * Automatically captures errors with stack traces.
 * SECURITY: Sanitizes sensitive data (OTP, passwords, tokens) from logs
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly sensitiveFields = [
    'password',
    'currentPassword',
    'newPassword',
    'confirmPassword',
    'otp',
    'token',
    'resetToken',
    'accessToken',
    'refreshToken',
  ];

  constructor(private readonly logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { method, url, requestId, user } = request;
    const userId = user?.sub || user?.id;
    const startTime = Date.now();

    // NOTE: We don't sanitize request.body here as it would break the actual request
    // Sanitization happens in getSanitizedBody() when we need to log

    return next.handle().pipe(
      tap(() => {
        const responseTime = Date.now() - startTime;
        const { statusCode } = response;

        // Log successful requests
        this.logger.logRequest(
          method,
          url,
          statusCode,
          responseTime,
          requestId,
          userId,
        );
      }),
      catchError((error) => {
        const responseTime = Date.now() - startTime;
        const statusCode = error instanceof HttpException ? error.getStatus() : 500;

        // Log error with stack trace
        this.logger.error(
          `${method} ${url} - ${error.message}`,
          error.stack,
          'HttpError',
          requestId,
          {
            statusCode,
            responseTime,
            userId,
            errorName: error.name,
          },
        );

        return throwError(() => error);
      }),
    );
  }

  /**
   * SECURITY: Get sanitized copy of request body for logging
   * Returns a copy with sensitive fields masked, leaving original intact
   * This prevents OTP codes, passwords, and tokens from appearing in logs
   */
  private getSanitizedBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    // Create a shallow copy to avoid modifying the original
    const sanitized = { ...body };

    for (const field of this.sensitiveFields) {
      if (sanitized[field]) {
        // Replace sensitive value with masked version in the COPY only
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}

/**
 * Centralized Logging Service
 * 
 * Production-ready logging with Better Stack (Logtail) integration.
 * Uses Winston for structured logging with multiple transports.
 */

import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as winston from 'winston';
import { Logtail } from '@logtail/node';
import { LogtailTransport } from '@logtail/winston';

@Injectable()
export class LoggerService implements NestLoggerService {
  private logger: winston.Logger;
  private logtail: Logtail | null = null;
  private readonly serviceName = 'onestaffos-api';
  private readonly isProduction = process.env.NODE_ENV === 'production';

  constructor() {
    this.initializeLogger();
  }

  private initializeLogger(): void {
    const transports: winston.transport[] = [];

    // Console transport for development (always enabled)
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.printf(({ timestamp, level, message, context, requestId, ...meta }) => {
            const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
            const reqId = requestId ? `[${requestId}]` : '';
            const ctx = context ? `[${context}]` : '';
            return `${timestamp} ${level} ${ctx}${reqId} ${message} ${metaStr}`;
          }),
        ),
      }),
    );

    // Logtail transport for production
    if (this.isProduction && process.env.LOGTAIL_SOURCE_TOKEN) {
      try {
        // Configure Logtail with EU region endpoint (matches wildcard cert)
        this.logtail = new Logtail(process.env.LOGTAIL_SOURCE_TOKEN, {
          endpoint: 'https://in.eu-nbg-2.betterstackdata.com'
        });
        transports.push(new LogtailTransport(this.logtail));
        console.log('✅ Logtail logging enabled (EU region)');
      } catch (error) {
        console.error('❌ Failed to initialize Logtail:', error.message);
      }
    } else if (!process.env.LOGTAIL_SOURCE_TOKEN) {
      console.warn('⚠️  LOGTAIL_SOURCE_TOKEN not set - remote logging disabled');
    }

    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      defaultMeta: {
        service: this.serviceName,
        environment: process.env.NODE_ENV || 'development',
      },
      transports,
    });
  }

  /**
   * Remove sensitive data from logs
   */
  private sanitize(data: any): any {
    if (!data || typeof data !== 'object') return data;

    const sanitized = { ...data };
    const sensitiveKeys = [
      'password',
      'passwordHash',
      'currentPassword',
      'newPassword',
      'confirmPassword',
      'otp',
      'token',
      'resetToken',
      'accessToken',
      'refreshToken',
      'secret',
      'apiKey',
      'authorization',
      'cookie',
      'sessionId',
    ];

    for (const key of sensitiveKeys) {
      if (key in sanitized) {
        sanitized[key] = '[REDACTED]';
      }
    }

    // Recursively sanitize nested objects
    for (const key in sanitized) {
      if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitize(sanitized[key]);
      }
    }

    return sanitized;
  }

  /**
   * Build log metadata
   */
  private buildMeta(context?: string, requestId?: string, additionalMeta?: any): any {
    return {
      context,
      requestId,
      ...this.sanitize(additionalMeta),
    };
  }

  log(message: string, context?: string, requestId?: string, meta?: any): void {
    this.logger.info(message, this.buildMeta(context, requestId, meta));
  }

  error(message: string, trace?: string, context?: string, requestId?: string, meta?: any): void {
    this.logger.error(message, this.buildMeta(context, requestId, { trace, ...meta }));
  }

  warn(message: string, context?: string, requestId?: string, meta?: any): void {
    this.logger.warn(message, this.buildMeta(context, requestId, meta));
  }

  debug(message: string, context?: string, requestId?: string, meta?: any): void {
    this.logger.debug(message, this.buildMeta(context, requestId, meta));
  }

  verbose(message: string, context?: string, requestId?: string, meta?: any): void {
    this.logger.verbose(message, this.buildMeta(context, requestId, meta));
  }

  /**
   * Log HTTP request
   */
  logRequest(
    method: string,
    url: string,
    statusCode: number,
    responseTime: number,
    requestId: string,
    userId?: string,
  ): void {
    this.logger.info('HTTP Request', {
      type: 'http_request',
      method,
      url,
      statusCode,
      responseTime,
      requestId,
      userId,
    });
  }

  /**
   * Log database query (optional, use sparingly)
   */
  logQuery(operation: string, collection: string, duration: number, requestId?: string): void {
    if (process.env.LOG_DB_QUERIES === 'true') {
      this.logger.debug('Database Query', {
        type: 'db_query',
        operation,
        collection,
        duration,
        requestId,
      });
    }
  }

  /**
   * Flush logs before shutdown
   */
  async flush(): Promise<void> {
    if (this.logtail) {
      await this.logtail.flush();
    }
  }
}

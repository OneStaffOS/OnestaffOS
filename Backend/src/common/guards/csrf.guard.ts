import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

/**
 * CSRF Protection Guard
 * Validates CSRF tokens for state-changing requests (POST, PUT, PATCH, DELETE)
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if CSRF protection is disabled for this route
    const isPublic = this.reflector.get<boolean>(
      'isPublic',
      context.getHandler(),
    );
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method;

    // Only check CSRF for state-changing methods
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return true;
    }

    // Skip CSRF for specific paths (e.g., webhooks)
    const skipCsrfPaths = ['/api/v1/webhooks'];
    if (skipCsrfPaths.some((path) => request.path.startsWith(path))) {
      return true;
    }

    // Get CSRF token from header or body
    const csrfToken =
      request.headers['x-csrf-token'] ||
      request.headers['x-xsrf-token'] ||
      (request.body && request.body._csrf);

    // Get CSRF token from cookie
    const csrfCookie = request.cookies['XSRF-TOKEN'];

    // Validate token
    if (!csrfToken || !csrfCookie || csrfToken !== csrfCookie) {
      throw new ForbiddenException('Invalid CSRF token');
    }

    return true;
  }
}

/**
 * Custom decorator to skip CSRF protection for specific routes
 */
export const SkipCsrf = () => {
  return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata('skipCsrf', true, descriptor.value);
    return descriptor;
  };
};

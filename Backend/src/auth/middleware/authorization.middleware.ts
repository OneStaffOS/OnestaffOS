
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role, ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class authorizationGaurd implements CanActivate {
  constructor(private reflector: Reflector) { }
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }
      const { user } = context.switchToHttp().getRequest();
      if (!user) throw new UnauthorizedException('no user attached');

      // Normalize roles: support older `role` string and new `roles` array.
      const rawUserRoles: string[] = Array.isArray(user.roles)
        ? user.roles
        : user.role
          ? [String(user.role)]
          : [];

      // Normalize helper: remove non-alphanumeric, underscores/spaces -> single space, lowercase
      const normalize = (s: string) => String(s || '')
        .replace(/[_\-]+/g, ' ')
        .replace(/[^a-zA-Z0-9 ]+/g, '')
        .trim()
        .toLowerCase();

      const userRoles = rawUserRoles.map(r => normalize(r));
      const requiredNorm = requiredRoles.map(r => normalize(r as any));

      // If user has no roles, deny access
      if (userRoles.length === 0) throw new ForbiddenException('You do not have permission to access this resource');

      // Check if any of the user's normalized roles match any required normalized role
      const hasRole = requiredNorm.some(reqR => userRoles.includes(reqR));
      if (!hasRole) throw new ForbiddenException('You do not have the required role to access this resource');
       
    return true;
  }
}
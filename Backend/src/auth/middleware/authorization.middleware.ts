
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
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
      const userRoles: string[] = Array.isArray(user.roles)
        ? user.roles
        : user.role
          ? [String(user.role)]
          : [];

      // If user has no roles, deny access
      if (userRoles.length === 0) throw new UnauthorizedException('unauthorized access');

      // Check if any of the user's roles match required roles
      const hasRole = requiredRoles.some((r) => userRoles.includes(r));
      if (!hasRole) throw new UnauthorizedException('unauthorized access');
       
    return true;
  }
}
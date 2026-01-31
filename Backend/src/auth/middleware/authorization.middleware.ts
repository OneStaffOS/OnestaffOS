
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role, ROLES_KEY } from '../decorators/roles.decorator';
import { JwtService } from '@nestjs/jwt';
import { ADMIN_PIN_BYPASS_KEY } from '../decorators/admin-pin-bypass.decorator';

@Injectable()
export class authorizationGaurd implements CanActivate {
  private readonly logger = new Logger(authorizationGaurd.name);
  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
  ) { }
  async canActivate(context: ExecutionContext): Promise<boolean> {
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
      if (userRoles.length === 0) {
        const request = context.switchToHttp().getRequest();
        this.logger.warn('Access denied: no roles on user', {
          method: request.method,
          path: request.path,
          userId: user?.sub || user?.employeeId || 'unknown',
        } as any);
        throw new ForbiddenException('You do not have permission to access this resource');
      }

      // Check if any of the user's normalized roles match any required normalized role
      const hasRole = requiredNorm.some(reqR => userRoles.includes(reqR));
      if (!hasRole) {
        const request = context.switchToHttp().getRequest();
        this.logger.warn('Access denied: role mismatch', {
          method: request.method,
          path: request.path,
          userId: user?.sub || user?.employeeId || 'unknown',
          requiredRoles: requiredRoles.map(r => String(r)),
          userRoles: rawUserRoles,
        } as any);
        throw new ForbiddenException('You do not have the required role to access this resource');
      }

      const normalizedSystemAdmin = normalize(Role.SYSTEM_ADMIN);
      const requiresSystemAdmin = requiredNorm.includes(normalizedSystemAdmin);
      const isSystemAdminUser = userRoles.includes(normalizedSystemAdmin);
      const isSystemAdminOnlyRoute = requiresSystemAdmin && requiredNorm.length === 1;
      if (isSystemAdminOnlyRoute && isSystemAdminUser) {
        const bypassAdminPin = this.reflector.getAllAndOverride<boolean>(
          ADMIN_PIN_BYPASS_KEY,
          [context.getHandler(), context.getClass()],
        );
        if (bypassAdminPin) {
          return true;
        }
        const request = context.switchToHttp().getRequest();
        const adminToken = request.cookies?.admin_token;
        const adminTokenPrev = request.cookies?.admin_token_prev;
        if (!adminToken && !adminTokenPrev) {
          throw new ForbiddenException('Admin PIN verification required');
        }

        const secret = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;
        if (!secret) {
          throw new ForbiddenException('Admin PIN verification required');
        }

        const employeeId = user?.sub || user?.employeeId;
        const verifyAdminToken = async (token: string | undefined) => {
          if (!token) {
            return false;
          }
          try {
            const payload = await this.jwtService.verifyAsync(token, { secret });
            if (!payload || payload.type !== 'admin') {
              return false;
            }
            if (payload.sub && String(payload.sub) !== String(employeeId)) {
              return false;
            }
            return true;
          } catch (err) {
            return false;
          }
        };

        const currentValid = await verifyAdminToken(adminToken);
        if (currentValid) {
          return true;
        }

        const prevValid = await verifyAdminToken(adminTokenPrev);
        if (!prevValid) {
          this.logger.warn('Admin token validation failed', {
            userId: user?.sub || user?.employeeId || 'unknown',
          } as any);
          throw new ForbiddenException('Admin PIN verification required');
        }
      }
       
    return true;
  }
}
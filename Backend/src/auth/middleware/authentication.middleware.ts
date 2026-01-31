import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import * as dotenv from 'dotenv';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
dotenv.config();

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(private jwtService: JwtService,private reflector: Reflector) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
          ]);
          if (isPublic) {
            const request = context.switchToHttp().getRequest();
            const token = this.extractTokenFromHeader(request);
            if (token) {
                try {
                    const payload = await this.jwtService.verifyAsync(token, { secret: process.env.JWT_SECRET });
                    if (!payload.employeeId && payload.sub) {
                        payload.employeeId = payload.sub;
                    }
                    request['user'] = payload;
                } catch (err: any) {
                    console.debug('[AuthGuard] token verification failed on public route, path=', request.path, 'reason=', err?.message);
                }
            }
            return true;
          }
        const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
        if (!token) {
            // No token found in cookie or Authorization header
            console.debug('[AuthGuard] no token found, path=', request.path);
            throw new UnauthorizedException('No token, please login');
        }
        try {
            const payload = await this.jwtService.verifyAsync(token, { secret: process.env.JWT_SECRET });
            // Normalize payload to include employeeId for convenience across the app
            if (!payload.employeeId && payload.sub) {
                payload.employeeId = payload.sub;
            }
            request['user'] = payload;
        } catch (err: any) {
            // Log verification failure (message only) for debugging
            console.debug('[AuthGuard] token verification failed for path=', request.path, 'reason=', err?.message);
            throw new UnauthorizedException('invalid token');
        }
        return true;
    }
    private extractTokenFromHeader(request: Request): string | undefined {
        // Controller sets cookie named 'access_token' — read that first.
        const tokenFromCookie = request.cookies?.access_token || request.cookies?.token;
        if (tokenFromCookie) return tokenFromCookie;

        const authHeader = request.headers['authorization'];
        if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
            return authHeader.split(' ')[1];
        }

        return undefined;
    }
}
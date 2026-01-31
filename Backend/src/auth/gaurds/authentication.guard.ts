
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
            return true;
          }
        const request = context.switchToHttp().getRequest();
        const token = this.extractTokenFromHeader(request);
        if (!token) {
            throw new UnauthorizedException('No token, please login');
        }
        
        // Industry-standard dual-key verification during rotation grace period
        // Try to verify with current JWT_SECRET first, then fallback to JWT_SECRET_OLD
        try {
            const payload = await this.jwtService.verifyAsync(
                token,
                {
                    secret: process.env.JWT_SECRET
                }
            );
            request['user'] = payload;
        } catch (error) {
            // If verification with current secret fails, try the old secret (grace period)
            if (process.env.JWT_SECRET_OLD) {
                try {
                    const payload = await this.jwtService.verifyAsync(
                        token,
                        {
                            secret: process.env.JWT_SECRET_OLD
                        }
                    );
                    request['user'] = payload;
                    // Token verified with old secret - session still valid during grace period
                } catch {
                    throw new UnauthorizedException('invalid token');
                }
            } else {
                throw new UnauthorizedException('invalid token');
            }
        }
        return true;
    }
    private extractTokenFromHeader(request: Request): string | undefined {
        // Try to get token from HTTP-only cookie first, then Authorization header
        const token = request.cookies?.access_token || request.headers['authorization']?.split(' ')[1];

        return token;
    }
}
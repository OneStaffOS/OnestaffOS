import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Get,
  HttpException,
  Res,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/SignInDto';
import { Public } from './decorators/public.decorator';
import { Role, Roles } from './decorators/roles.decorator';
import { authorizationGaurd } from 'src/auth/middleware/authorization.middleware';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  async signIn(@Body() signInDto: SignInDto, @Res({ passthrough: true }) res: Response) {
    try {
      const result = await this.authService.signIn(signInDto.email, signInDto.password);

      // Match cookie maxAge to the JWT expiry (in seconds).
      // Support env values as numeric seconds ("3600") or short strings like "1h", "30m", "7d".
      const parseExpirySeconds = (v?: string): number => {
        if (!v) return 3600;
        const n = Number(v);
        if (Number.isFinite(n)) return Math.max(1, Math.floor(n));
        const m = v.match(/^(\d+)([smhd])$/i);
        if (m) {
          const val = Number(m[1]);
          const unit = m[2].toLowerCase();
          switch (unit) {
            case 's': return val;
            case 'm': return val * 60;
            case 'h': return val * 3600;
            case 'd': return val * 86400;
          }
        }
        // Fallback to 1 hour
        return 3600;
      };
      const expiresSec = parseExpirySeconds(process.env.JWT_EXPIRES_IN);
      res.cookie('access_token', result.accessToken, {
        httpOnly: true, // Prevents client-side JavaScript access
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        maxAge: expiresSec * 1000, // Cookie expiration time in milliseconds
      });
      // Return success response with accessToken
      return {
        statusCode: HttpStatus.OK,
        message: 'Login successful',
        accessToken: result.accessToken,
        user: result.payload,
      };
    } catch (error) {
        console.log(error)
      // Handle specific errors
      if (error instanceof HttpException) {
        throw error; // Pass through known exceptions
      }

      // Handle other unexpected errors
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'An error occurred during login',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) res: Response) {
    const secure = process.env.NODE_ENV === 'production';
    const domain = process.env.COOKIE_DOMAIN || undefined;

    res.clearCookie('access_token', {
      httpOnly: true,
      secure,
      sameSite: secure ? 'none' : 'lax',
      path: '/',
      domain,
    });

    return { ok: true, message: 'Logged out' };
  }

  @Roles(Role.DEPARTMENT_EMPLOYEE, Role.DEPARTMENT_HEAD, Role.DEPARTMENT_HEAD, Role.HR_EMPLOYEE, Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN, Role.SYSTEM_ADMIN)
  @UseGuards(authorizationGaurd)
  @Get('me')
  @HttpCode(HttpStatus.OK)
  async me(@Req() req: Request) {
    const user = (req as any).user;
    if (!user) {
      throw new HttpException(
        { statusCode: HttpStatus.UNAUTHORIZED, message: 'Not authenticated' },
        HttpStatus.UNAUTHORIZED,
      );
    }
    return { ok: true, user };
  }
}
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
import { SkipCsrf } from '../common/guards/csrf.guard';
import { generateSecureToken } from '../common/utils/security.utils';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @SkipCsrf()
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
      
      // Set access token cookie with security flags
      res.cookie('access_token', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: expiresSec * 1000,
        path: '/',
      });

      // Generate and set CSRF token
      const csrfToken = generateSecureToken();
      res.cookie('XSRF-TOKEN', csrfToken, {
        httpOnly: false, // Client needs to read this
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: expiresSec * 1000,
        path: '/',
      });
      
      // Return success response with accessToken
      return {
        statusCode: HttpStatus.OK,
        message: 'Login successful',
        accessToken: result.accessToken,
        user: result.payload,
        csrfToken, // Send token in response body as well
      };
    } catch (error) {
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
  @SkipCsrf()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) res: Response) {
    const secure = process.env.NODE_ENV === 'production';
    const domain = process.env.COOKIE_DOMAIN || undefined;

    res.clearCookie('access_token', {
      httpOnly: true,
      secure,
      sameSite: secure ? 'strict' : 'lax',
      path: '/',
      domain,
    });

    res.clearCookie('XSRF-TOKEN', {
      httpOnly: false,
      secure,
      sameSite: secure ? 'strict' : 'lax',
      path: '/',
      domain,
    });

    return { ok: true, message: 'Logged out' };
  }

  @Public()
  @SkipCsrf()
  @Get('csrf-token')
  @HttpCode(HttpStatus.OK)
  async getCsrfToken(@Res({ passthrough: true }) res: Response) {
    const csrfToken = generateSecureToken();
    
    res.cookie('XSRF-TOKEN', csrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 3600 * 1000, // 1 hour
      path: '/',
    });

    return { csrfToken };
  }

  @Roles(Role.DEPARTMENT_EMPLOYEE, Role.DEPARTMENT_HEAD, Role.DEPARTMENT_HEAD, Role.HR_EMPLOYEE, Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN, Role.SYSTEM_ADMIN,Role.PAYROLL_MANAGER,Role.PAYROLL_SPECIALIST,Role.FINANCE_STAFF,Role.LEGAL_POLICY_ADMIN,Role.RECRUITER,Role.JOB_CANDIDATE)
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
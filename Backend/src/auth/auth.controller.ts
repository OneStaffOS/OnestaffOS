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
  Logger,
  Query,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import axios from 'axios';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/SignInDto';
import { Public } from './decorators/public.decorator';
import { Role, Roles } from './decorators/roles.decorator';
import { AdminPinBypass } from './decorators/admin-pin-bypass.decorator';
import { authorizationGaurd } from 'src/auth/middleware/authorization.middleware';
import { AuthGuard } from './middleware/authentication.middleware';
import { SkipCsrf } from '../common/guards/csrf.guard';
import { generateSecureToken } from '../common/utils/security.utils';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  private readonly csrfMaxAgeMs = 24 * 60 * 60 * 1000;

  constructor(private readonly authService: AuthService) {}

  @Public()
  @SkipCsrf()
  @Post('login')
  async signIn(@Body() signInDto: SignInDto, @Res({ passthrough: true }) res: Response) {
    const correlationId = `login_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this.logger.log(`[${correlationId}] Login attempt for: ${signInDto.email}`);

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
      
      // If MFA is required, don't set the access token cookie yet
      // The client needs to complete MFA first
      if (result.mfaRequired) {
        this.logger.log(`[${correlationId}] MFA required for ${signInDto.email}`);
        
        // Generate a temporary CSRF token for MFA flow
        const csrfToken = generateSecureToken();
        res.cookie('XSRF-TOKEN', csrfToken, {
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
          maxAge: this.csrfMaxAgeMs,
          path: '/',
        });

        return {
          statusCode: HttpStatus.OK,
          message: 'MFA verification required',
          mfaRequired: true,
          user: result.payload,
          csrfToken,
          // Note: We still return accessToken for backend compatibility,
          // but frontend should not store it until MFA is complete
          accessToken: result.accessToken,
        };
      }

      // No MFA required - proceed with normal login
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
        maxAge: this.csrfMaxAgeMs,
        path: '/',
      });

      this.logger.log(`[${correlationId}] Login successful for ${signInDto.email}`);
      
      // Return success response
      // accessToken is in HTTP-only cookie (not in response body for security)
      return {
        statusCode: HttpStatus.OK,
        message: 'Login successful',
        mfaRequired: false,
        user: result.payload,
        csrfToken, // Send token in response body as well
        ...(result.adminPinRequired ? { adminPinRequired: true } : {}),
      };
    } catch (error) {
      this.logger.error(`[${correlationId}] Login failed: ${(error as Error).message}`);
      
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

  /**
   * Complete login after MFA verification
   * This endpoint is called after successful passkey authentication
   */
  @Public()
  @SkipCsrf()
  @Post('login/complete-mfa')
  @HttpCode(HttpStatus.OK)
  async completeMfaLogin(
    @Body() body: { accessToken: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const correlationId = `mfa_complete_${Date.now()}`;
    this.logger.log(`[${correlationId}] Completing MFA login`);

    const { accessToken } = body;
    if (!accessToken) {
      throw new HttpException('Access token required', HttpStatus.BAD_REQUEST);
    }

    // Parse expiry from env
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
      return 3600;
    };
    const expiresSec = parseExpirySeconds(process.env.JWT_EXPIRES_IN);

    // Set the access token cookie now that MFA is complete
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: expiresSec * 1000,
      path: '/',
    });

    // Generate fresh CSRF token
    const csrfToken = generateSecureToken();
    res.cookie('XSRF-TOKEN', csrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: this.csrfMaxAgeMs,
      path: '/',
    });

    this.logger.log(`[${correlationId}] MFA login completed successfully`);

    return {
      statusCode: HttpStatus.OK,
      message: 'MFA verification complete',
      csrfToken,
    };
  }

  @Public()
  @SkipCsrf()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) res: Response) {
    const secure = process.env.NODE_ENV === 'production';
    const domain = process.env.COOKIE_DOMAIN;

    res.clearCookie('access_token', {
      httpOnly: true,
      secure,
      sameSite: secure ? 'strict' : 'lax',
      path: '/',
      domain,
    });

    res.clearCookie('admin_token', {
      httpOnly: true,
      secure,
      sameSite: secure ? 'strict' : 'lax',
      path: '/',
      domain,
    });
    res.clearCookie('admin_token_prev', {
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
      maxAge: this.csrfMaxAgeMs,
      path: '/',
    });

    return { csrfToken };
  }

  // ================= GOOGLE OAUTH =================
  @Public()
  @SkipCsrf()
  @Get('google')
  async redirectToGoogle(
    @Res() res: Response,
    @Query('redirect') redirect?: string,
  ) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      throw new HttpException('Google OAuth is not configured', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const state = redirect ? Buffer.from(redirect).toString('base64url') : '';

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
      state,
    });

    if (!res) {
      throw new HttpException('Response object not available', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  }

  @Public()
  @SkipCsrf()
  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!code) {
      throw new HttpException('Missing authorization code', HttpStatus.BAD_REQUEST);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new HttpException('Google OAuth is not configured', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const tokenResponse = await axios.post(
      'https://oauth2.googleapis.com/token',
      new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );

    const googleAccessToken = tokenResponse.data.access_token;
    if (!googleAccessToken) {
      throw new HttpException('Failed to exchange token with Google', HttpStatus.UNAUTHORIZED);
    }

    const profileResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${googleAccessToken}` },
    });

    const email = profileResponse.data?.email;
    if (!email) {
      throw new HttpException('Google account email not available', HttpStatus.UNAUTHORIZED);
    }

    const signInResult = await this.authService.signInWithGoogle(email);

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
      return 3600;
    };
    const expiresSec = parseExpirySeconds(process.env.JWT_EXPIRES_IN);

    res.cookie('access_token', signInResult.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: expiresSec * 1000,
      path: '/',
    });

    const csrfToken = generateSecureToken();
    res.cookie('XSRF-TOKEN', csrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: this.csrfMaxAgeMs,
      path: '/',
    });

    const redirectTargetRaw =
      state ? Buffer.from(state, 'base64url').toString('utf8') : process.env.OAUTH_SUCCESS_REDIRECT || '/';
    const redirectTarget = signInResult.adminPinRequired
      ? `/verify-admin-pin?redirect=${encodeURIComponent(redirectTargetRaw)}`
      : redirectTargetRaw;

    res.redirect(redirectTarget);
  }

  @Public()
  @SkipCsrf()
  @Get('login/google/callback')
  async googleLoginCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.googleCallback(code, state, res);
  }

  @Post('admin-pin/verify')
  @UseGuards(AuthGuard, authorizationGaurd)
  @Roles(Role.SYSTEM_ADMIN)
  @AdminPinBypass()
  async verifyAdminPin(
    @Req() req: Request,
    @Body() body: { adminPin: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const adminPin = body?.adminPin;
    if (!adminPin) {
      throw new HttpException('Admin PIN is required', HttpStatus.BAD_REQUEST);
    }

    const previousToken = (req as any)?.cookies?.admin_token;
    const adminToken = await this.authService.verifyAdminPin((req as any).user.sub, adminPin);
    if (previousToken) {
      res.cookie('admin_token_prev', previousToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 24 * 60 * 60 * 1000,
        path: '/',
      });
    } else {
      res.clearCookie('admin_token_prev', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        path: '/',
      });
    }
    res.cookie('admin_token', adminToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    });

    return { ok: true };
  }

  @Public()
  @SkipCsrf()
  @Get('me')
  @HttpCode(HttpStatus.OK)
  async me(@Req() req: Request) {
    const user = (req as any).user;
    if (!user) {
      return { ok: false, user: null };
    }
    return { ok: true, user };
  }
}

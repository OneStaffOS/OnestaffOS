import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { PasswordResetService as PasswordResetOtpService } from './password-reset-otp.service';
import {
  RequestPasswordResetDto,
  VerifyOtpDto,
  VerifyResetTokenDto,
  ResetPasswordDto,
} from './dto/password-reset.dto';
import { Public } from '../auth/decorators/public.decorator';

/**
 * Password Reset Controller
 * Handles OTP-based password reset flow
 * 
 * Flow:
 * 1. POST /password-reset/request -> Send OTP to email
 * 2. POST /password-reset/verify-otp -> Verify OTP, get reset token
 * 3. GET /password-reset/verify-token -> Validate token (frontend check)
 * 4. POST /password-reset/reset -> Reset password with token
 */
@Controller('password-reset')
export class PasswordResetController {
  private readonly logger = new Logger(PasswordResetController.name);

  constructor(
    private readonly passwordResetService: PasswordResetOtpService,
  ) {}

  /**
   * STEP 1: Request password reset - Send OTP to email
   * Public endpoint - no authentication required
   * Always returns success to prevent user enumeration
   */
  @Public()
  @Post('request')
  @HttpCode(HttpStatus.OK)
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.passwordResetService.requestPasswordReset(dto);
  }

  /**
   * STEP 2: Verify OTP and issue reset token
   * Public endpoint - no authentication required
   * Returns reset token if OTP is valid
   */
  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    // SECURITY: Never log the OTP value, only log sanitized information
    this.logger.log(`OTP verification requested for email: ${dto.email.substring(0, 3)}***`);
    return this.passwordResetService.verifyOtp(dto);
  }

  /**
   * STEP 3: Verify reset token validity
   * Public endpoint - used by frontend to validate token
   * Returns { valid: true/false, email?: string }
   */
  @Public()
  @Get('verify-token')
  async verifyResetToken(@Query() dto: VerifyResetTokenDto) {
    this.logger.log('Token verification requested');
    return this.passwordResetService.verifyResetToken(dto.token);
  }

  /**
   * STEP 4: Reset password using valid token
   * Public endpoint - no authentication required
   * Returns { success: true } on successful reset
   */
  @Public()
  @Post('reset')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    try {
      return await this.passwordResetService.resetPassword(dto);
    } catch (error) {
      // Pass through BadRequestException with its message
      throw error;
    }
  }
}

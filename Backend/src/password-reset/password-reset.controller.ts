import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { PasswordResetService } from './password-reset.service';
import {
  RequestPasswordResetDto,
  VerifyResetTokenDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from './dto/password-reset.dto';
import { AuthGuard } from '../auth/gaurds/authentication.guard';
import { Public } from '../auth/decorators/public.decorator';

@Controller('password-reset')
export class PasswordResetController {
  constructor(private readonly passwordResetService: PasswordResetService) {}

  /**
   * Request password reset - sends reset link to email
   * Public endpoint - no authentication required
   */
  @Public()
  @Post('request')
  @HttpCode(HttpStatus.OK)
  async requestPasswordReset(
    @Body() dto: RequestPasswordResetDto,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];

    return this.passwordResetService.requestPasswordReset(
      dto,
      ipAddress,
      userAgent,
    );
  }

  /**
   * Verify if a reset token is valid
   * Public endpoint - no authentication required
   */
  @Public()
  @Get('verify-token')
  async verifyResetToken(@Query() dto: VerifyResetTokenDto) {
    return this.passwordResetService.verifyResetToken(dto.token);
  }

  /**
   * Reset password using token
   * Public endpoint - no authentication required
   */
  @Public()
  @Post('reset')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.passwordResetService.resetPassword(dto);
  }

  /**
   * Change password for authenticated user
   * Public endpoint for forced password change after expiry
   */
  @Public()
  @Post('change')
  @HttpCode(HttpStatus.OK)
  async changePassword(@Body() dto: ChangePasswordDto) {
    return this.passwordResetService.changePassword(dto.employeeId, dto);
  }

  /**
   * Check if user's password is expired
   * Public endpoint with optional employeeId query param
   * Or protected for authenticated users
   */
  @Public()
  @Get('check-expiry')
  async checkPasswordExpiry(@Query('employeeId') employeeId: string) {
    if (!employeeId) {
      return {
        isExpired: false,
        message: 'No employee ID provided',
      };
    }
    return this.passwordResetService.checkPasswordExpiry(employeeId);
  }

  /**
   * Check password expiry for authenticated user
   * Protected endpoint - requires authentication
   */
  @UseGuards(AuthGuard)
  @Get('my-expiry')
  async checkMyPasswordExpiry(@Req() req: any) {
    const employeeId = req.user?.sub;
    if (!employeeId) {
      throw new Error('User not authenticated');
    }
    return this.passwordResetService.checkPasswordExpiry(employeeId);
  }
}

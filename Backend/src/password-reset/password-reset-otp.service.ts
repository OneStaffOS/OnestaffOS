import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import {
  RequestPasswordResetDto,
  VerifyOtpDto,
  ResetPasswordDto,
} from './dto/password-reset.dto';
import { EmailService } from '../common/utils/email.service';
import {
  generateOtp,
  hashOtp,
  verifyOtp,
  generateResetToken,
  hashResetToken,
  calculateOtpExpiry,
  calculateTokenExpiry,
  isExpired,
  validatePasswordStrength,
} from '../common/utils/password-reset-security.utils';

/**
 * Password Reset Service with OTP-based verification
 * Implements industry-standard secure password reset flow
 */
@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);
  private readonly SALT_ROUNDS = 10;

  constructor(
    @InjectModel('EmployeeProfile')
    private employeeProfileModel: Model<any>,
    private emailService: EmailService,
  ) {}

  /**
   * STEP 1: Request password reset - Generate and send OTP via email
   * Always returns success to prevent user enumeration
   */
  async requestPasswordReset(
    dto: RequestPasswordResetDto,
  ): Promise<{ success: boolean; message: string }> {
    const { email } = dto;

    try {
      const employee = await this.employeeProfileModel.findOne({
        $or: [
          { workEmail: email.toLowerCase() },
          { personalEmail: email.toLowerCase() },
        ],
      });

      if (!employee) {
        return {
          success: true,
          message:
            'If an account exists with this email, you will receive an OTP shortly.',
        };
      }

      // SECURITY: Generate OTP and immediately hash it
      const otp = generateOtp();
      const otpHash = await hashOtp(otp);
      const otpExpiry = calculateOtpExpiry();

      // Store only the hashed OTP, never the plain text
      await this.employeeProfileModel.findByIdAndUpdate(employee._id, {
        resetOtpHash: otpHash,
        resetOtpExpiresAt: otpExpiry,
      });

      // DEBUG: Confirm OTP was stored (without exposing the hash)
      this.logger.debug(
        `OTP stored for employee: hashLength=${otpHash?.length}, expiresIn=${Math.floor((otpExpiry.getTime() - Date.now()) / 1000)}s`,
      );

      // SECURITY: Send OTP via email only - never log or expose in response
      const emailSent = await this.emailService.sendOtpEmail(
        email,
        otp,
        employee.firstName,
      );

      if (!emailSent) {
        // SECURITY: Don't log full email to prevent user enumeration
        this.logger.error('Failed to send OTP email during password reset');
      }

      // SECURITY: Clear OTP from memory after use
      // TypeScript doesn't have explicit memory management, but we can at least
      // not keep references to the plain OTP

      return {
        success: true,
        message:
          'If an account exists with this email, you will receive an OTP shortly.',
      };
    } catch (error) {
      this.logger.error('Error in requestPasswordReset:', error);
      return {
        success: true,
        message:
          'If an account exists with this email, you will receive an OTP shortly.',
      };
    }
  }

  /**
   * STEP 2: Verify OTP and issue reset token
   * Returns reset token if OTP is valid
   */
  async verifyOtp(
    dto: VerifyOtpDto,
  ): Promise<{ success: boolean; token?: string; message?: string }> {
    const { email, otp } = dto;

    try {
      // Find employee by email
      const employee = await this.employeeProfileModel.findOne({
        $or: [
          { workEmail: email.toLowerCase() },
          { personalEmail: email.toLowerCase() },
        ],
      });

      if (!employee) {
        throw new BadRequestException('Invalid OTP or email');
      }

      // Check if OTP exists
      if (!employee.resetOtpHash || !employee.resetOtpExpiresAt) {
        throw new BadRequestException(
          'No OTP request found. Please request a new OTP.',
        );
      }

      // Check if OTP has expired
      if (isExpired(employee.resetOtpExpiresAt)) {
        // Clear expired OTP
        await this.employeeProfileModel.findByIdAndUpdate(employee._id, {
          resetOtpHash: null,
          resetOtpExpiresAt: null,
        });
        throw new BadRequestException('OTP has expired. Please request a new one.');
      }

      // Verify OTP against hashed version
      const isValidOtp = await verifyOtp(otp, employee.resetOtpHash);

      // DEBUG: Log OTP verification details (without exposing actual OTP)
      this.logger.debug(
        `OTP verification: length=${otp?.length}, hasHash=${!!employee.resetOtpHash}, isValid=${isValidOtp}`,
      );

      if (!isValidOtp) {
        throw new BadRequestException('Invalid OTP');
      }

      // OTP is valid - generate reset token
      const { token, hashedToken } = generateResetToken();
      const tokenExpiry = calculateTokenExpiry();

      // Store hashed token and clear OTP fields (single-use OTP)
      await this.employeeProfileModel.findByIdAndUpdate(employee._id, {
        passwordResetTokenHash: hashedToken,
        passwordResetExpiresAt: tokenExpiry,
        resetOtpHash: null, // Clear OTP (single-use)
        resetOtpExpiresAt: null,
      });

      this.logger.log(
        `OTP verified successfully for employee ${employee._id}. Reset token issued.`,
      );

      return {
        success: true,
        token: token, // Return plain token to user
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Error in verifyOtp:', error);
      throw new BadRequestException('Invalid OTP or email');
    }
  }

  /**
   * STEP 3: Verify reset token validity (used by frontend)
   * Returns token validity and associated email
   */
  async verifyResetToken(
    token: string,
  ): Promise<{ valid: boolean; email?: string }> {
    try {
      // Hash the provided token to match stored hash
      const hashedToken = hashResetToken(token);

      // Find employee with matching token that hasn't expired
      const employee = await this.employeeProfileModel.findOne({
        passwordResetTokenHash: hashedToken,
        passwordResetExpiresAt: { $gt: new Date() },
      });

      if (!employee) {
        return { valid: false };
      }

      // Return employee's email (work email preferred, fallback to personal)
      const email = employee.workEmail || employee.personalEmail;

      return { valid: true, email };
    } catch (error) {
      this.logger.error('Error in verifyResetToken:', error);
      return { valid: false };
    }
  }

  /**
   * STEP 4: Reset password using valid token
   * Validates token, updates password, and invalidates token
   */
  async resetPassword(
    dto: ResetPasswordDto,
  ): Promise<{ success: boolean; message?: string }> {
    const { token, newPassword, confirmPassword } = dto;

    try {
      // Validate input
      if (!token || !newPassword || !confirmPassword) {
        throw new BadRequestException(
          'Token, new password, and confirm password are required',
        );
      }

      // Validate passwords match
      if (newPassword !== confirmPassword) {
        throw new BadRequestException('Passwords do not match');
      }

      // Validate password strength
      const passwordValidation = validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        throw new BadRequestException(passwordValidation.message);
      }

      // Hash token to match stored hash
      const hashedToken = hashResetToken(token);

      // Find employee with valid token
      const employee = await this.employeeProfileModel.findOne({
        passwordResetTokenHash: hashedToken,
        passwordResetExpiresAt: { $gt: new Date() },
      });

      if (!employee) {
        throw new BadRequestException('Invalid or expired reset token');
      }

      // Check if new password is same as current password
      if (employee.password) {
        const isSamePassword = await bcrypt.compare(
          newPassword,
          employee.password,
        );
        if (isSamePassword) {
          throw new BadRequestException(
            'New password must be different from your current password',
          );
        }
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

      // Update password and clear reset token (single-use token)
      const updateResult = await this.employeeProfileModel.findByIdAndUpdate(
        employee._id,
        {
          password: hashedPassword,
          passwordResetTokenHash: null,
          passwordResetExpiresAt: null,
        },
        { new: true },
      );

      if (!updateResult) {
        throw new BadRequestException(
          'Failed to update password. Please try again.',
        );
      }

      this.logger.log(
        `Password reset successfully for employee ${employee._id}`,
      );

      // Send confirmation email
      const email = employee.workEmail || employee.personalEmail;
      if (email) {
        await this.emailService.sendPasswordResetConfirmationEmail(
          email,
          employee.firstName,
        );
      }

      return {
        success: true,
        message:
          'Your password has been reset successfully. You can now log in with your new password.',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Error in resetPassword:', error);
      throw new BadRequestException(
        'Failed to reset password. Please try again.',
      );
    }
  }
}

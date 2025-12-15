import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PasswordResetToken, PasswordResetTokenDocument } from './models/password-reset-token.schema';
import { PasswordHistory, PasswordHistoryDocument } from './models/password-history.schema';
import {
  RequestPasswordResetDto,
  ResetPasswordDto,
  ChangePasswordDto,
  PasswordResetResponseDto,
  PasswordExpiryCheckDto,
} from './dto/password-reset.dto';

// Configuration constants
const RESET_TOKEN_EXPIRY_HOURS = 1; // Token valid for 1 hour
const PASSWORD_EXPIRY_DAYS = 90; // Password expires after 90 days
const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;

@Injectable()
export class PasswordResetService {
  constructor(
    @InjectModel(PasswordResetToken.name)
    private passwordResetTokenModel: Model<PasswordResetTokenDocument>,
    @InjectModel(PasswordHistory.name)
    private passwordHistoryModel: Model<PasswordHistoryDocument>,
    @InjectModel('EmployeeProfile')
    private employeeProfileModel: Model<any>,
  ) {}

  /**
   * Request password reset - generates token and returns it
   * In production, this would send an email with the reset link
   */
  async requestPasswordReset(
    dto: RequestPasswordResetDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<PasswordResetResponseDto> {
    const { email } = dto;

    // Find employee by email
    const employee = await this.employeeProfileModel.findOne({
      $or: [{ workEmail: email }, { personalEmail: email }],
    });

    if (!employee) {
      // Return success even if user not found (security best practice)
      return {
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      };
    }

    // Invalidate any existing unused tokens for this employee
    await this.passwordResetTokenModel.updateMany(
      { employeeId: employee._id, used: false },
      { used: true },
    );

    // Generate secure random token
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Calculate expiry time
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + RESET_TOKEN_EXPIRY_HOURS);

    // Create reset token record
    await this.passwordResetTokenModel.create({
      employeeId: employee._id,
      email: email.toLowerCase(),
      token: hashedToken,
      expiresAt,
      used: false,
      ipAddress,
      userAgent,
    });

    // In production, send email here with reset link
    // For now, we'll return the token (in production, only return success message)
    return {
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
      // Remove token in production - this is for development/testing only
      token: token,
      expiresAt,
    };
  }

  /**
   * Verify if a reset token is valid
   */
  async verifyResetToken(token: string): Promise<{ valid: boolean; email?: string }> {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const resetToken = await this.passwordResetTokenModel.findOne({
      token: hashedToken,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!resetToken) {
      return { valid: false };
    }

    return { valid: true, email: resetToken.email };
  }

  /**
   * Reset password using token
   */
  async resetPassword(dto: ResetPasswordDto): Promise<PasswordResetResponseDto> {
    const { token, newPassword, confirmPassword } = dto;

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    // Validate password strength
    this.validatePasswordStrength(newPassword);

    // Hash and verify token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const resetToken = await this.passwordResetTokenModel.findOne({
      token: hashedToken,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!resetToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Get employee
    const employee = await this.employeeProfileModel.findById(resetToken.employeeId);
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Check if new password is same as current (if exists)
    if (employee.password) {
      const isSamePassword = await bcrypt.compare(newPassword, employee.password);
      if (isSamePassword) {
        throw new BadRequestException('New password must be different from your current password');
      }
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update employee password
    await this.employeeProfileModel.findByIdAndUpdate(resetToken.employeeId, {
      password: hashedPassword,
    });

    // Mark token as used
    await this.passwordResetTokenModel.findByIdAndUpdate(resetToken._id, {
      used: true,
    });

    // Record password change in history
    await this.recordPasswordChange(resetToken.employeeId, resetToken.email, 'RESET');

    return {
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.',
    };
  }

  /**
   * Change password (for logged-in users or forced change)
   */
  async changePassword(
    employeeId: string,
    dto: ChangePasswordDto,
  ): Promise<PasswordResetResponseDto> {
    const { currentPassword, newPassword, confirmPassword } = dto;

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    // Validate password strength
    this.validatePasswordStrength(newPassword);

    // Get employee
    const employee = await this.employeeProfileModel
      .findById(employeeId)
      .select('+password');

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Verify current password
    if (employee.password) {
      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        employee.password,
      );
      if (!isCurrentPasswordValid) {
        throw new UnauthorizedException('Current password is incorrect');
      }

      // Check if new password is same as current
      const isSamePassword = await bcrypt.compare(newPassword, employee.password);
      if (isSamePassword) {
        throw new BadRequestException('New password must be different from your current password');
      }
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update employee password
    await this.employeeProfileModel.findByIdAndUpdate(employeeId, {
      password: hashedPassword,
    });

    // Get employee email for history
    const employeeEmail = employee.workEmail || employee.personalEmail || '';

    // Record password change in history
    await this.recordPasswordChange(new Types.ObjectId(employeeId), employeeEmail, 'CHANGE');

    return {
      success: true,
      message: 'Password has been changed successfully.',
    };
  }

  /**
   * Check if password is expired (90 days)
   * Grace period: Password expiry enforcement starts 30 days from feature deployment (Jan 14, 2026)
   */
  async checkPasswordExpiry(employeeId: string): Promise<PasswordExpiryCheckDto> {
    // Grace period: Don't enforce password expiry until 30 days from now (Jan 14, 2026)
    const ENFORCEMENT_START_DATE = new Date('2026-01-14');
    const now = new Date();
    
    if (now < ENFORCEMENT_START_DATE) {
      // Grace period active - don't enforce password expiry yet
      const daysUntilEnforcement = Math.ceil((ENFORCEMENT_START_DATE.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        isExpired: false,
        daysUntilExpiry: 90 + daysUntilEnforcement, // Approximate
        lastChangedAt: null,
        expiresAt: null,
        message: '', // No message during grace period
      };
    }

    // Get the most recent password change record
    const lastPasswordChange = await this.passwordHistoryModel
      .findOne({ employeeId: new Types.ObjectId(employeeId) })
      .sort({ passwordChangedAt: -1 });

    if (!lastPasswordChange) {
      // No password history - user needs to set up password after grace period
      return {
        isExpired: true,
        daysUntilExpiry: 0,
        lastChangedAt: null,
        expiresAt: null,
        message: 'Please set up a new password for your account.',
      };
    }

    const expiresAt = lastPasswordChange.expiresAt;
    const isExpired = now >= expiresAt;

    // Calculate days until expiry
    const timeDiff = expiresAt.getTime() - now.getTime();
    const daysUntilExpiry = Math.max(0, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)));

    let message = '';
    if (isExpired) {
      message = 'Your password has expired. Please change it to continue.';
    } else if (daysUntilExpiry <= 7) {
      message = `Your password will expire in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}. Consider changing it soon.`;
    } else if (daysUntilExpiry <= 14) {
      message = `Your password will expire in ${daysUntilExpiry} days.`;
    }

    return {
      isExpired,
      daysUntilExpiry,
      lastChangedAt: lastPasswordChange.passwordChangedAt,
      expiresAt: lastPasswordChange.expiresAt,
      message,
    };
  }

  /**
   * Record password change in history
   */
  private async recordPasswordChange(
    employeeId: Types.ObjectId,
    email: string,
    changeType: 'RESET' | 'CHANGE' | 'ADMIN_RESET' | 'INITIAL',
  ): Promise<void> {
    const now = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + PASSWORD_EXPIRY_DAYS);

    await this.passwordHistoryModel.create({
      employeeId,
      email: email.toLowerCase(),
      passwordChangedAt: now,
      expiresAt,
      changeType,
    });
  }

  /**
   * Validate password strength
   */
  private validatePasswordStrength(password: string): void {
    const errors: string[] = [];

    if (password.length < MIN_PASSWORD_LENGTH) {
      errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    if (errors.length > 0) {
      throw new BadRequestException(errors.join('. '));
    }
  }

  /**
   * Initialize password history for an employee (call after registration)
   */
  async initializePasswordHistory(employeeId: Types.ObjectId, email: string): Promise<void> {
    await this.recordPasswordChange(employeeId, email, 'INITIAL');
  }
}

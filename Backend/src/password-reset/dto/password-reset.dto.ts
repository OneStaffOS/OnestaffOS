import { IsEmail, IsNotEmpty, IsString, MinLength, Matches, IsOptional, IsBoolean, IsNumber, IsDate } from 'class-validator';

// STEP 1: Request password reset (send OTP)
export class RequestPasswordResetDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

// STEP 2: Verify OTP and get reset token
export class VerifyOtpDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  otp: string;
}

// STEP 3: Verify token (used by frontend to check token validity)
export class VerifyResetTokenDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}

// STEP 4: Reset password with token
export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  newPassword: string;

  @IsString()
  @IsNotEmpty()
  confirmPassword: string;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  newPassword: string;

  @IsString()
  @IsNotEmpty()
  confirmPassword: string;
}

export class CheckPasswordExpiryDto {
  @IsString()
  @IsNotEmpty()
  employeeId: string;
}

// Response DTOs
export class PasswordResetResponseDto {
  success: boolean;
  message: string;
  token?: string; // Only for development/testing
  expiresAt?: Date;
}

export class PasswordExpiryCheckDto {
  isExpired: boolean;
  daysUntilExpiry: number;
  lastChangedAt: Date | null;
  expiresAt: Date | null;
  message?: string;
}

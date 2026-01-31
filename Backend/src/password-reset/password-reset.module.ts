import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
// COMMENTED OUT OLD CONTROLLER - Using OTP-based flow only
// import { PasswordResetController } from './password-reset.controller';
import { PasswordResetController as PasswordResetOtpController } from './password-reset-otp.controller';
// COMMENTED OUT OLD SERVICE - Using OTP-based flow only
// import { PasswordResetService } from './password-reset.service';
import { PasswordResetService as PasswordResetOtpService } from './password-reset-otp.service';
import { EmailService } from '../common/utils/email.service';
import {
  PasswordResetToken,
  PasswordResetTokenSchema,
} from './models/password-reset-token.schema';
import {
  PasswordHistory,
  PasswordHistorySchema,
} from './models/password-history.schema';
import { EmployeeProfile, EmployeeProfileSchema } from '../employee-profile/models/employee-profile.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PasswordResetToken.name, schema: PasswordResetTokenSchema },
      { name: PasswordHistory.name, schema: PasswordHistorySchema },
      { name: EmployeeProfile.name, schema: EmployeeProfileSchema },
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  // ONLY register OTP controller now
  controllers: [PasswordResetOtpController],
  // ONLY register OTP service now
  providers: [PasswordResetOtpService, EmailService],
  exports: [PasswordResetOtpService],
})
export class PasswordResetModule {}

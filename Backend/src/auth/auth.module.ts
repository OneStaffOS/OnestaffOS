import { Module, forwardRef } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmployeeProfileModule } from 'src/employee-profile/employee-profile.module';
import { JwtModule } from '@nestjs/jwt';
import { PasskeysModule } from '../passkeys/passkeys.module';
import * as dotenv from 'dotenv';
dotenv.config();

@Module({
  controllers: [AuthController],
  providers: [AuthService],
  imports:[
    EmployeeProfileModule,
    forwardRef(() => PasskeysModule),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: {
        expiresIn: ((): string | number => {
          const v = process.env.JWT_EXPIRES_IN;
          if (!v) return '1h';
          const n = Number(v);
          return Number.isFinite(n) ? n : v;
        })() as any,
      },
    }),
  ],
  exports: [AuthService],
})
export class AuthModule {}
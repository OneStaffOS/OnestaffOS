/**
 * PasskeysModule
 * Module for WebAuthn/FIDO2 passkey management
 * Provides MFA capabilities via device biometrics
 */

import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PasskeysController } from './passkeys.controller';
import { PasskeysService } from './passkeys.service';
import { EmployeePasskey, EmployeePasskeySchema } from './models/employee-passkey.schema';
import { WebAuthnChallenge, WebAuthnChallengeSchema } from './models/webauthn-challenge.schema';
import { EmployeeProfileModule } from '../employee-profile/employee-profile.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EmployeePasskey.name, schema: EmployeePasskeySchema },
      { name: WebAuthnChallenge.name, schema: WebAuthnChallengeSchema },
    ]),
    forwardRef(() => EmployeeProfileModule),
  ],
  controllers: [PasskeysController],
  providers: [PasskeysService],
  exports: [PasskeysService],
})
export class PasskeysModule {}

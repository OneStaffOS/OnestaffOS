import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { BiometricsController } from './biometrics.controller';
import { BiometricsService } from './biometrics.service';
import { BiometricVerificationGuard } from './guards/biometric-verification.guard';
import { EncryptionModule } from '../common/encryption';
import { FaceTemplate, FaceTemplateSchema } from './models/face-template.schema';
import { VerificationChallenge, VerificationChallengeSchema } from './models/verification-challenge.schema';
import { RecognitionEvent, RecognitionEventSchema } from './models/recognition-event.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FaceTemplate.name, schema: FaceTemplateSchema },
      { name: VerificationChallenge.name, schema: VerificationChallengeSchema },
      { name: RecognitionEvent.name, schema: RecognitionEventSchema },
    ]),
    EncryptionModule,
    HttpModule.register({
      baseURL: process.env.BIOMETRICS_SERVICE_URL || 'http://localhost:6000',
      timeout: Number(process.env.BIOMETRICS_SERVICE_TIMEOUT_MS || 30000),
    }),
  ],
  controllers: [BiometricsController],
  providers: [BiometricsService, BiometricVerificationGuard],
  exports: [BiometricVerificationGuard, MongooseModule],
})
export class BiometricsModule {}

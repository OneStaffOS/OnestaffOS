import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { HttpService } from '@nestjs/axios';
import { BiometricsService } from './biometrics.service';
import { FaceTemplate } from './models/face-template.schema';
import { VerificationChallenge } from './models/verification-challenge.schema';
import { RecognitionEvent } from './models/recognition-event.schema';
import { EncryptionService, EncryptionKeyType } from '../common/encryption/encryption.service';
import { BiometricsChallengeAction } from './models/verification-challenge.schema';

describe('BiometricsService', () => {
  let service: BiometricsService;
  const challengeModel = { create: jest.fn() };
  const recognitionEventModel = {
    countDocuments: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
  };

  const encryptionService = {
    getPublicKey: jest.fn().mockReturnValue('public-key'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BiometricsService,
        { provide: getModelToken(FaceTemplate.name), useValue: {} },
        { provide: getModelToken(VerificationChallenge.name), useValue: challengeModel },
        { provide: getModelToken(RecognitionEvent.name), useValue: recognitionEventModel },
        { provide: EncryptionService, useValue: encryptionService },
        { provide: HttpService, useValue: {} },
      ],
    }).compile();

    service = module.get<BiometricsService>(BiometricsService);
  });

  it('creates a challenge with biometrics key type', async () => {
    const result = await service.createChallenge('employee-id', BiometricsChallengeAction.VERIFY);
    expect(challengeModel.create).toHaveBeenCalled();
    expect(result.keyType).toBe(EncryptionKeyType.BIOMETRICS);
    expect(result.publicKey).toBe('public-key');
  });
});

import { IsEnum, IsOptional } from 'class-validator';
import { BiometricsChallengeAction } from '../models/verification-challenge.schema';

export class CreateChallengeDto {
  @IsEnum(BiometricsChallengeAction)
  @IsOptional()
  action?: BiometricsChallengeAction;
}

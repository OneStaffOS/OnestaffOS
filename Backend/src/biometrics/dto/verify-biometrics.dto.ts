import { Type } from 'class-transformer';
import { IsString, ValidateNested } from 'class-validator';
import { EncryptedPayloadDto } from './encrypted-payload.dto';

export class VerifyBiometricsDto {
  @IsString()
  challengeId: string;

  @IsString()
  nonce: string;

  @ValidateNested()
  @Type(() => EncryptedPayloadDto)
  payload: EncryptedPayloadDto;
}

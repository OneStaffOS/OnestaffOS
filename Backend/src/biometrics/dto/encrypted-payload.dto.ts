import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { EncryptionKeyType } from '../../common/encryption/encryption.service';

export class EncryptedPayloadDto {
  @IsString()
  ciphertext: string;

  @IsString()
  iv: string;

  @IsString()
  tag: string;

  @IsString()
  encryptedKey: string;

  @IsEnum(EncryptionKeyType)
  keyType: EncryptionKeyType;

  @IsNumber()
  timestamp: number;

  @IsOptional()
  @IsNumber()
  version?: number;
}

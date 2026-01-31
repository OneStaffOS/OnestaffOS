import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class EncryptedMessageDataDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  ciphertext: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  iv: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  tag: string;
}

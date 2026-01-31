import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { EncryptedMessageDataDto } from './encrypted-message-data.dto';

export class EncryptedChatMessageDto {
  @ValidateNested()
  @Type(() => EncryptedMessageDataDto)
  encryptedMessage: EncryptedMessageDataDto;

  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  encryptedSessionKey: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  sessionId?: string;
}

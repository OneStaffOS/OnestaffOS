import { IsString, IsNotEmpty, IsOptional, IsArray, IsMongoId, IsBoolean } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  ticketId: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsArray()
  @IsOptional()
  attachments?: string[];
}

export class JoinRoomDto {
  @IsString()
  @IsNotEmpty()
  ticketId: string;
}

export class TypingDto {
  @IsString()
  @IsNotEmpty()
  ticketId: string;

  @IsBoolean()
  isTyping: boolean;
}

export class MarkMessagesReadDto {
  @IsMongoId()
  @IsNotEmpty()
  ticketId: string;
}

export class GetMessagesDto {
  @IsMongoId()
  @IsNotEmpty()
  ticketId: string;

  @IsOptional()
  limit?: number;

  @IsOptional()
  before?: string; // Message ID for pagination
}

export class NotificationQueryDto {
  @IsOptional()
  @IsBoolean()
  unreadOnly?: boolean;

  @IsOptional()
  limit?: number;

  @IsOptional()
  skip?: number;
}

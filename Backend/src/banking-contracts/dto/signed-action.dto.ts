import { IsString, IsOptional, IsNumber, IsISO8601, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SignedTransactionPayloadDto {
  @IsString()
  txId: string;

  @IsString()
  actorId: string;

  @IsString()
  actorRole: string;

  @IsString()
  action: string;

  @IsOptional()
  @IsString()
  contractId?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsString()
  nonce: string;

  @IsISO8601()
  timestamp: string;
}

export class SignedActionDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => SignedTransactionPayloadDto)
  payload?: SignedTransactionPayloadDto;

  @IsOptional()
  @IsString()
  signature?: string;

  @IsOptional()
  @IsString()
  actorKeyId?: string;
}

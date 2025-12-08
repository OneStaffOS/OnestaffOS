import { IsNumber, IsArray, IsOptional, ValidateNested, IsDateString, IsString } from 'class-validator';
import { Type } from 'class-transformer';

class BlockedPeriodDto {
  @IsDateString()
  from: string;

  @IsDateString()
  to: string;

  @IsString()
  reason: string;
}

export class CreateCalendarDto {
  @IsNumber()
  year: number;

  @IsOptional()
  @IsArray()
  holidays?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BlockedPeriodDto)
  blockedPeriods?: BlockedPeriodDto[];
}

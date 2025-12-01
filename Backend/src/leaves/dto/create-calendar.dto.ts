import { IsNumber, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class BlockedPeriodDto {
  from: Date;
  to: Date;
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

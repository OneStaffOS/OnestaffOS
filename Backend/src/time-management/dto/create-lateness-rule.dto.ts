import { IsString, IsNumber, IsBoolean, IsOptional, Min } from 'class-validator';

export class CreateLatenessRuleDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  gracePeriodMinutes?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  deductionForEachMinute?: number;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

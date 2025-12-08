import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class FlagIrregularPatternDto {
  @IsString()
  requestId: string;

  @IsBoolean()
  irregularPatternFlag: boolean;

  @IsOptional()
  @IsString()
  flaggedBy?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

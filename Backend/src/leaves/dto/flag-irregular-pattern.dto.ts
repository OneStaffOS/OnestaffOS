import { IsString, IsBoolean } from 'class-validator';

export class FlagIrregularPatternDto {
  @IsString()
  requestId: string;

  @IsBoolean()
  irregularPatternFlag: boolean;

  @IsString()
  flaggedBy: string;

  @IsString()
  reason: string;
}

import { IsString, IsMongoId, IsEnum, IsNumber, IsBoolean, IsOptional, Min } from 'class-validator';
import { PunchPolicy } from '../models/enums/index';

export class CreateShiftDto {
  @IsString()
  name: string;

  @IsMongoId()
  shiftType: string;

  @IsString()
  startTime: string;

  @IsString()
  endTime: string;

  @IsEnum(PunchPolicy)
  @IsOptional()
  punchPolicy?: PunchPolicy;

  @IsNumber()
  @Min(0)
  @IsOptional()
  graceInMinutes?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  graceOutMinutes?: number;

  @IsBoolean()
  @IsOptional()
  requiresApprovalForOvertime?: boolean;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

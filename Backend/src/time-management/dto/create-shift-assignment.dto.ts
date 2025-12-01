import { IsMongoId, IsDate, IsEnum, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ShiftAssignmentStatus } from '../models/enums/index';

export class CreateShiftAssignmentDto {
  @IsMongoId()
  @IsOptional()
  employeeId?: string;

  @IsMongoId()
  @IsOptional()
  departmentId?: string;

  @IsMongoId()
  @IsOptional()
  positionId?: string;

  @IsMongoId()
  shiftId: string;

  @IsMongoId()
  @IsOptional()
  scheduleRuleId?: string;

  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  endDate?: Date;

  @IsEnum(ShiftAssignmentStatus)
  @IsOptional()
  status?: ShiftAssignmentStatus;
}

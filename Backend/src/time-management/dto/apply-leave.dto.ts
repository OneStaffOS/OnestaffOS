import { IsMongoId, IsString, IsISO8601, IsOptional } from 'class-validator';

export class ApplyLeaveDto {
  @IsMongoId()
  employeeId: string;

  @IsISO8601()
  startDate: string;

  @IsISO8601()
  endDate: string;

  @IsOptional()
  @IsString()
  type?: string; // VACATION, SICK, etc.

  @IsOptional()
  mappingId?: string;
}

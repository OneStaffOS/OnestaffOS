import { IsString, IsDateString, IsOptional, IsNumber } from 'class-validator';

export class CreateLeaveRequestDto {
  @IsString()
  employeeId: string;

  @IsString()
  leaveTypeId: string;

  @IsDateString()
  dateFrom: string;

  @IsDateString()
  dateTo: string;

  @IsNumber()
  durationDays: number;

  @IsOptional()
  @IsString()
  justification?: string;

  @IsOptional()
  @IsString()
  attachmentId?: string;
}

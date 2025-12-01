import { IsString, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class CreateLeaveEntitlementDto {
  @IsString()
  employeeId: string;

  @IsString()
  leaveTypeId: string;

  @IsNumber()
  yearlyEntitlement: number;

  @IsOptional()
  @IsNumber()
  carryForward?: number;

  @IsOptional()
  @IsDateString()
  nextResetDate?: string;
}

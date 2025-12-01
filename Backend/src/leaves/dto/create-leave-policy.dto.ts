import { IsString, IsEnum, IsNumber, IsBoolean, IsOptional, IsObject } from 'class-validator';
import { AccrualMethod } from '../enums/accrual-method.enum';
import { RoundingRule } from '../enums/rounding-rule.enum';

export class CreateLeavePolicyDto {
  @IsString()
  leaveTypeId: string;

  @IsEnum(AccrualMethod)
  accrualMethod: AccrualMethod;

  @IsNumber()
  monthlyRate: number;

  @IsNumber()
  yearlyRate: number;

  @IsBoolean()
  carryForwardAllowed: boolean;

  @IsNumber()
  maxCarryForward: number;

  @IsOptional()
  @IsNumber()
  expiryAfterMonths?: number;

  @IsEnum(RoundingRule)
  roundingRule: RoundingRule;

  @IsNumber()
  minNoticeDays: number;

  @IsOptional()
  @IsNumber()
  maxConsecutiveDays?: number;

  @IsOptional()
  @IsObject()
  eligibility?: Record<string, any>;
}

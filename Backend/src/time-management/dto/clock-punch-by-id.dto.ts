import { IsEnum, IsDate, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { PunchType } from '../models/enums/index';

/**
 * DTO for clocking in/out using employee number (for kiosk/external systems)
 * US-5: Clock-In/Out using ID
 */
export class ClockPunchByIdDto {
  @IsString()
  employeeNumber: string; // Employee ID/Badge number

  @IsEnum(PunchType)
  type: PunchType; // IN or OUT

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  time?: Date; // Optional timestamp (defaults to now)
}

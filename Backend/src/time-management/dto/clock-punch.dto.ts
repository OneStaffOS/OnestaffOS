import { IsEnum, IsDate, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { PunchType } from '../models/enums/index';

export class ClockPunchDto {
  @IsEnum(PunchType)
  type: PunchType;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  time?: Date;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  terminalId?: string;

  @IsString()
  @IsOptional()
  deviceId?: string;
}

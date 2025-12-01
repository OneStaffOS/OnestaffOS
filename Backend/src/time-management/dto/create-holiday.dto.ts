import { IsEnum, IsDate, IsString, IsBoolean, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { HolidayType } from '../models/enums/index';

export class CreateHolidayDto {
  @IsEnum(HolidayType)
  type: HolidayType;

  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  endDate?: Date;

  @IsString()
  @IsOptional()
  name?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

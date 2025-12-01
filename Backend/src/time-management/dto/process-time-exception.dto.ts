import { IsEnum, IsString, IsOptional } from 'class-validator';
import { TimeExceptionStatus } from '../models/enums/index';

export class ProcessTimeExceptionDto {
  @IsEnum(TimeExceptionStatus)
  status: TimeExceptionStatus;

  @IsString()
  @IsOptional()
  notes?: string;
}

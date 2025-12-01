import { IsMongoId, IsString, IsOptional, IsEnum } from 'class-validator';
import { TimeExceptionType } from '../models/enums/index';

export class CreateTimeExceptionDto {
  @IsMongoId()
  attendanceRecordId: string;

  @IsMongoId()
  assignedTo: string;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsEnum(TimeExceptionType)
  @IsOptional()
  type?: TimeExceptionType;
}

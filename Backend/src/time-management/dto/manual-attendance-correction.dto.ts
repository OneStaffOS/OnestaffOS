import { IsMongoId, IsArray, IsString, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class PunchDto {
  @IsString()
  type: string;

  @IsString()
  time: string;
}

export class ManualAttendanceCorrectionDto {
  @IsMongoId()
  employeeId: string;

  @IsMongoId()
  attendanceRecordId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PunchDto)
  punches: PunchDto[];

  @IsString()
  @IsOptional()
  reason?: string;
}

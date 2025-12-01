import { IsMongoId, IsString, IsOptional } from 'class-validator';

export class CreateCorrectionRequestDto {
  @IsMongoId()
  attendanceRecordId: string;

  @IsString()
  @IsOptional()
  reason?: string;
}

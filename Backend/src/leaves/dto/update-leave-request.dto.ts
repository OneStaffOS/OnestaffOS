import { IsDateString, IsOptional, IsNumber, IsString } from 'class-validator';

export class UpdateLeaveRequestDto {
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsNumber()
  durationDays?: number;

  @IsOptional()
  @IsString()
  justification?: string;

  @IsOptional()
  @IsString()
  attachmentId?: string;
}

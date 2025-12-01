import { IsString, IsMongoId, IsNumber, IsOptional, Min, IsDateString } from 'class-validator';

export class CreateJobRequisitionDto {
  @IsMongoId()
  @IsOptional()
  templateId?: string;

  @IsNumber()
  @Min(1)
  openings: number;

  @IsString()
  @IsOptional()
  location?: string;

  @IsMongoId()
  hiringManagerId: string;

  @IsDateString()
  @IsOptional()
  expiryDate?: string;
}

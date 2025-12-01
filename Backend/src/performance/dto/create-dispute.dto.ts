import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateDisputeDto {
  @IsNotEmpty()
  @IsString()
  appraisalId: string;

  @IsNotEmpty()
  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  details?: string;
}

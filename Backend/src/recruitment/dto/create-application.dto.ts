import { IsMongoId, IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateApplicationDto {
  @IsMongoId()
  candidateId: string;

  @IsMongoId()
  requisitionId: string;

  @IsBoolean()
  @IsOptional()
  isReferral?: boolean;

  @IsString()
  @IsOptional()
  coverLetter?: string;
}

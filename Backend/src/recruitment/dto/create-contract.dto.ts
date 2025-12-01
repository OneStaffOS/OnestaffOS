import { IsMongoId, IsDate, IsString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateContractDto {
  @IsMongoId()
  offerId: string;

  @IsDate()
  @Type(() => Date)
  acceptanceDate: Date;

  @IsString()
  @IsOptional()
  employeeSignatureUrl?: string;

  @IsString()
  @IsOptional()
  employerSignatureUrl?: string;
}

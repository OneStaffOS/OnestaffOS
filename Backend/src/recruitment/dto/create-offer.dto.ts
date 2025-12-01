import { IsMongoId, IsNumber, IsArray, IsString, IsDate, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOfferDto {
  @IsMongoId()
  applicationId: string;

  @IsMongoId()
  candidateId: string;

  @IsNumber()
  @Min(0)
  grossSalary: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  signingBonus?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  benefits?: string[];

  @IsString()
  @IsOptional()
  conditions?: string;

  @IsString()
  @IsOptional()
  insurances?: string;

  @IsString()
  content: string;

  @IsString()
  role: string;

  @IsDate()
  @Type(() => Date)
  deadline: Date;
}

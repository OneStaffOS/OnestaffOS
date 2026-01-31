import { IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateContractDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  requestedService: string;

  @IsMongoId()
  departmentId: string;

  @IsNumber()
  @Min(1)
  timeEstimateDays: number;

  @IsNumber()
  @Min(1)
  paymentAmount: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

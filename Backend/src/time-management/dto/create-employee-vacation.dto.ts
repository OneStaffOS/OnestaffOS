import { IsString, IsOptional, IsMongoId, IsInt, Min } from 'class-validator';

export class CreateEmployeeVacationDto {
  @IsMongoId()
  employeeId: string;

  @IsMongoId()
  packageId: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  entitledDays?: number;

  @IsOptional()
  effectiveFrom?: string;

  @IsOptional()
  effectiveTo?: string;
}

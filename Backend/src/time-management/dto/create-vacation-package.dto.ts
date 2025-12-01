import { IsString, IsInt, IsOptional, Min } from 'class-validator';

export class CreateVacationPackageDto {
  @IsString()
  name: string;

  @IsInt()
  @Min(0)
  daysPerYear: number;

  @IsOptional()
  @IsString()
  accrualPolicy?: string;

  @IsOptional()
  @IsInt()
  carryForwardLimit?: number;

  @IsOptional()
  active?: boolean;
}

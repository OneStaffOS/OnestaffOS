import { IsInt, IsString, Min, Max, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateCompanySettingsDto {
  @IsInt()
  @Min(1)
  @Max(28)
  @IsOptional()
  payDate?: number;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  timeZone?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  currency?: string;
}

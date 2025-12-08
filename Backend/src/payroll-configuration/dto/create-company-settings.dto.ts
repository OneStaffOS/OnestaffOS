import { IsInt, IsString, Min, Max, IsNotEmpty } from 'class-validator';

export class CreateCompanySettingsDto {
  @IsInt()
  @Min(1)
  @Max(28)
  payDate: number;

  @IsString()
  @IsNotEmpty()
  timeZone: string;

  @IsString()
  @IsNotEmpty()
  currency: string;
}

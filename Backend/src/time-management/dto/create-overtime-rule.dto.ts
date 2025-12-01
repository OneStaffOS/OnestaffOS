import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreateOvertimeRuleDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsBoolean()
  @IsOptional()
  approved?: boolean;
}

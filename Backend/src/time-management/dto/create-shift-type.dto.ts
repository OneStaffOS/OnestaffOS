import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreateShiftTypeDto {
  @IsString()
  name: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

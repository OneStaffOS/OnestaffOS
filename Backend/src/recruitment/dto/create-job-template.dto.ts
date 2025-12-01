import { IsString, IsArray, IsOptional } from 'class-validator';

export class CreateJobTemplateDto {
  @IsString()
  title: string;

  @IsString()
  department: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  qualifications?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skills?: string[];

  @IsString()
  @IsOptional()
  description?: string;
}

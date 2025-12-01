import { IsNotEmpty, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { Types } from 'mongoose';

export class OnboardingTaskDto {
  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  department: string;

  @IsOptional()
  deadline?: Date;

  @IsOptional()
  notes?: string;
}

export class CreateOnboardingDto {
  @IsNotEmpty()
  employeeId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OnboardingTaskDto)
  tasks: OnboardingTaskDto[];
}

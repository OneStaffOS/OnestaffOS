import { IsString, IsNotEmpty, IsOptional, IsArray, IsDateString } from 'class-validator';

export class CreateNotificationDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  targetRole?: string;

  @IsOptional()
  @IsArray()
  targetEmployeeIds?: string[];

  @IsOptional()
  @IsArray()
  targetDepartmentIds?: string[];

  @IsOptional()
  @IsArray()
  targetPositionIds?: string[];

  @IsOptional()
  @IsDateString()
  sendAt?: string; // ISO date string
}

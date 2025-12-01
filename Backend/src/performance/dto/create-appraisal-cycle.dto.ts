import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDate, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AppraisalTemplateType } from '../enums/performance.enums';

export class CycleTemplateAssignmentDto {
  @IsNotEmpty()
  @IsString()
  templateId: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  departmentIds?: string[];
}

export class CreateAppraisalCycleDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsEnum(AppraisalTemplateType)
  cycleType: AppraisalTemplateType;

  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  endDate: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  managerDueDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  employeeAcknowledgementDueDate?: Date;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CycleTemplateAssignmentDto)
  templateAssignments?: CycleTemplateAssignmentDto[];
}

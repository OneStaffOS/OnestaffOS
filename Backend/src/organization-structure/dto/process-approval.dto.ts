import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApprovalDecision } from '../enums/organization-structure.enums';

export class ProcessApprovalDto {
  @IsEnum(ApprovalDecision)
  decision: ApprovalDecision;

  @IsOptional()
  @IsString()
  comments?: string;
}

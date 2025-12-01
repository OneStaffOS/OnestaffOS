import { IsEnum, IsString, IsOptional } from 'class-validator';
import { ApprovalStatus } from '../enums/approval-status.enum';

export class ProcessOfferApprovalDto {
  @IsEnum(ApprovalStatus)
  status: ApprovalStatus;

  @IsString()
  @IsOptional()
  comment?: string;
}

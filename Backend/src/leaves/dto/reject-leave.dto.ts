import { IsString, IsOptional } from 'class-validator';

export class RejectLeaveDto {
  @IsString()
  approverId: string;

  @IsString()
  approverRole: string;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  comments?: string;
}

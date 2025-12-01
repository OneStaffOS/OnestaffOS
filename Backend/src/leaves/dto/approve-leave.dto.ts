import { IsString, IsOptional } from 'class-validator';

export class ApproveLeaveDto {
  @IsString()
  approverId: string;

  @IsString()
  approverRole: string;

  @IsOptional()
  @IsString()
  comments?: string;
}

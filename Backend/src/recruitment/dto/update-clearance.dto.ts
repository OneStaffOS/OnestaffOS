import { IsString, IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { ApprovalStatus } from '../enums/approval-status.enum';

export class UpdateClearanceItemDto {
  @IsString()
  department: string;

  @IsEnum(ApprovalStatus)
  status: ApprovalStatus;

  @IsString()
  @IsOptional()
  comments?: string;
}

export class UpdateEquipmentReturnDto {
  @IsString()
  equipmentId: string;

  @IsBoolean()
  returned: boolean;

  @IsString()
  @IsOptional()
  condition?: string;
}

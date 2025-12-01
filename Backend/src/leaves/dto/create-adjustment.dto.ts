import { IsString, IsEnum, IsNumber } from 'class-validator';
import { AdjustmentType } from '../enums/adjustment-type.enum';

export class CreateAdjustmentDto {
  @IsString()
  employeeId: string;

  @IsString()
  leaveTypeId: string;

  @IsEnum(AdjustmentType)
  adjustmentType: AdjustmentType;

  @IsNumber()
  amount: number;

  @IsString()
  reason: string;

  @IsString()
  hrUserId: string;
}

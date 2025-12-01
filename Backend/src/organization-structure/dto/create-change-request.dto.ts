import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { StructureRequestType } from '../enums/organization-structure.enums';

export class CreateChangeRequestDto {
  @IsNotEmpty()
  @IsEnum(StructureRequestType)
  requestType: StructureRequestType;

  @IsOptional()
  @IsString()
  targetDepartmentId?: string;

  @IsOptional()
  @IsString()
  targetPositionId?: string;

  @IsOptional()
  @IsString()
  details?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

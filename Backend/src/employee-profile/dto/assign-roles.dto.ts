import { IsArray, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { SystemRole } from '../enums/employee-profile.enums';

export class AssignRolesDto {
  @IsArray()
  @IsEnum(SystemRole, { each: true })
  roles: SystemRole[];

  @IsOptional()
  @IsArray()
  permissions?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

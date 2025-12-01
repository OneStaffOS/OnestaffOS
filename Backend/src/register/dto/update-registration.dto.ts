import { IsEnum, IsOptional } from 'class-validator';
import { RegistrationStatus } from '../enums/registration-status.enum';

export class UpdateRegistrationDto {
  @IsOptional()
  @IsEnum(RegistrationStatus)
  status?: RegistrationStatus;
}

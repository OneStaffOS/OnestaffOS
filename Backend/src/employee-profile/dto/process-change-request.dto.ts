import { IsEnum, IsNotEmpty } from 'class-validator';
import { ProfileChangeStatus } from '../enums/employee-profile.enums';

export class ProcessChangeRequestDto {
  @IsNotEmpty()
  @IsEnum(ProfileChangeStatus)
  status: ProfileChangeStatus;
}

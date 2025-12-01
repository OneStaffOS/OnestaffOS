import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { GraduationType } from '../enums/employee-profile.enums';

export class CreateQualificationDto {
  @IsNotEmpty()
  @IsString()
  establishmentName: string;

  @IsNotEmpty()
  @IsEnum(GraduationType)
  graduationType: GraduationType;
}

import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class UpdateAdminPinDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  pin: string;
}

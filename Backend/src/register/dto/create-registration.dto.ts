import { IsEmail, IsNotEmpty, MinLength, IsDateString } from 'class-validator';

export class CreateRegistrationDto {
  @IsNotEmpty()
  firstName: string;

  @IsNotEmpty()
  lastName: string;

  @IsNotEmpty()
  nationalId: string;

  @IsDateString()
  @IsNotEmpty()
  dateOfBirth: string;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(6)
  password: string;
}

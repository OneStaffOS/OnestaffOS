import { IsNotEmpty } from 'class-validator';

export class VerifyRegistrationDto {
  @IsNotEmpty()
  token: string;
}

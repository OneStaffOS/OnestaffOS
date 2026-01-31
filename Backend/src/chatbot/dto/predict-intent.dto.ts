import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class PredictIntentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string;
}

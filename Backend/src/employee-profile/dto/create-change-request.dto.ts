import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateChangeRequestDto {
  @IsNotEmpty()
  @IsString()
  requestDescription: string;

  @IsOptional()
  @IsString()
  reason?: string;
}


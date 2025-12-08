import { IsString, IsOptional } from 'class-validator';

export class RejectApplicationDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  customMessage?: string; // Optional: custom rejection message
}
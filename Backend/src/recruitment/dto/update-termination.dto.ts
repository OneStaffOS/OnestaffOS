import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { TerminationStatus } from '../enums/termination-status.enum';

export class UpdateTerminationDto {
  @IsOptional()
  @IsString()
  hrComments?: string;

  @IsOptional()
  @IsEnum(TerminationStatus)
  status?: TerminationStatus;

  @IsOptional()
  @IsDateString()
  terminationDate?: string;
}

import { IsEnum, IsString, IsOptional } from 'class-validator';
import { TerminationStatus } from '../enums/termination-status.enum';

export class ProcessTerminationDto {
  @IsEnum(TerminationStatus)
  status: TerminationStatus;

  @IsString()
  @IsOptional()
  hrComments?: string;
}

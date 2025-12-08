import { IsEnum, IsNotEmpty, IsOptional, IsString, IsDateString } from 'class-validator';
import { TerminationInitiation } from '../enums/termination-initiation.enum';

export class CreateTerminationDto {
  @IsNotEmpty()
  @IsString()
  employeeId: string;

  @IsNotEmpty()
  @IsEnum(TerminationInitiation)
  initiator: TerminationInitiation;

  @IsNotEmpty()
  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  employeeComments?: string;

  @IsOptional()
  @IsString()
  hrComments?: string;

  @IsOptional()
  @IsDateString()
  terminationDate?: string;

  @IsNotEmpty()
  @IsString()
  contractId: string;
}

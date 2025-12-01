import { IsMongoId, IsEnum, IsString, IsDate, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { TerminationInitiation } from '../enums/termination-initiation.enum';

export class CreateTerminationRequestDto {
  @IsMongoId()
  employeeId: string;

  @IsEnum(TerminationInitiation)
  initiator: TerminationInitiation;

  @IsString()
  reason: string;

  @IsString()
  @IsOptional()
  employeeComments?: string;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  terminationDate?: Date;

  @IsMongoId()
  contractId: string;
}

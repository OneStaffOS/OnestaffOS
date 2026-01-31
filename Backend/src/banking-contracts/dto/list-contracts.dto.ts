import { IsEnum, IsOptional } from 'class-validator';
import { ContractStatus } from '../enums/banking-contracts.enums';

export class ListContractsDto {
  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;
}

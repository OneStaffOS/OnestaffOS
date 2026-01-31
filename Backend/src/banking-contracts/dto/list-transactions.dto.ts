import { IsEnum, IsOptional } from 'class-validator';
import { BankingTransactionType } from '../enums/banking-contracts.enums';

export class ListTransactionsDto {
  @IsOptional()
  @IsEnum(BankingTransactionType)
  type?: BankingTransactionType;
}

import { IsBoolean, IsOptional } from 'class-validator';

export class ProcessFinalSettlementDto {
  @IsBoolean()
  @IsOptional()
  includeUnusedLeave?: boolean;
}
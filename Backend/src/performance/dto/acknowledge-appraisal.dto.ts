import { IsOptional, IsString } from 'class-validator';

export class AcknowledgeAppraisalDto {
  @IsOptional()
  @IsString()
  comment?: string;
}

import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsObject } from 'class-validator';
import { AppraisalDisputeStatus } from '../enums/performance.enums';

export class ResolveDisputeDto {
  @IsNotEmpty()
  @IsEnum(AppraisalDisputeStatus)
  status: AppraisalDisputeStatus;

  @IsOptional()
  @IsString()
  resolutionSummary?: string;

  // When HR resolves a dispute as ADJUSTED they may provide adjusted appraisal data.
  // These fields are optional and will only be applied when `status === ADJUSTED`.
  @IsOptional()
  @IsObject()
  adjustedRatings?: any;

  @IsOptional()
  @IsNumber()
  adjustedTotalScore?: number;

  @IsOptional()
  @IsString()
  adjustedOverallRatingLabel?: string;
}

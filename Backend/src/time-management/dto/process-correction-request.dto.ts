import { IsEnum } from 'class-validator';
import { CorrectionRequestStatus } from '../models/enums/index';

export class ProcessCorrectionRequestDto {
  @IsEnum(CorrectionRequestStatus)
  status: CorrectionRequestStatus;
}

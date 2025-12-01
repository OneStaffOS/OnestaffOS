import { PartialType } from '@nestjs/mapped-types';
import { CreateAppraisalCycleDto } from './create-appraisal-cycle.dto';

export class UpdateAppraisalCycleDto extends PartialType(CreateAppraisalCycleDto) {}

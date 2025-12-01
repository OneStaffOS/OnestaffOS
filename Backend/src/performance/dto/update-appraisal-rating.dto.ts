import { PartialType } from '@nestjs/mapped-types';
import { CreateAppraisalRatingDto } from './create-appraisal-rating.dto';

export class UpdateAppraisalRatingDto extends PartialType(CreateAppraisalRatingDto) {}

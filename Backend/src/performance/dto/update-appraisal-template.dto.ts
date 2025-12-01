import { PartialType } from '@nestjs/mapped-types';
import { CreateAppraisalTemplateDto } from './create-appraisal-template.dto';

export class UpdateAppraisalTemplateDto extends PartialType(CreateAppraisalTemplateDto) {}

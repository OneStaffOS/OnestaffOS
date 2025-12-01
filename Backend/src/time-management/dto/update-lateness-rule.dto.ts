import { PartialType } from '@nestjs/mapped-types';
import { CreateLatenessRuleDto } from './create-lateness-rule.dto';

export class UpdateLatenessRuleDto extends PartialType(CreateLatenessRuleDto) {}

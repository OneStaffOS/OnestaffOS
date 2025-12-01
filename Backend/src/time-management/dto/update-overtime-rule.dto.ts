import { PartialType } from '@nestjs/mapped-types';
import { CreateOvertimeRuleDto } from './create-overtime-rule.dto';

export class UpdateOvertimeRuleDto extends PartialType(CreateOvertimeRuleDto) {}

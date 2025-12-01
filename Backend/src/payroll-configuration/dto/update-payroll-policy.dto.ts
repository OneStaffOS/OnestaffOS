import { IsString, IsEnum, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PolicyType, Applicability } from '../enums/payroll-configuration-enums';
import { RuleDefinitionDto } from './create-payroll-policy.dto';

export class UpdatePayrollPolicyDto {
    @IsString()
    @IsOptional()
    policyName?: string;

    @IsEnum(PolicyType)
    @IsOptional()
    policyType?: PolicyType;

    @IsString()
    @IsOptional()
    description?: string;

    @IsOptional()
    effectiveDate?: Date;

    @ValidateNested()
    @Type(() => RuleDefinitionDto)
    @IsOptional()
    ruleDefinition?: RuleDefinitionDto;

    @IsEnum(Applicability)
    @IsOptional()
    applicability?: Applicability;
}

import { IsString, IsNotEmpty, IsEnum, IsOptional, IsNumber, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PolicyType, Applicability } from '../enums/payroll-configuration-enums';

export class RuleDefinitionDto {
    @IsOptional()
    @IsNumber()
    @Min(0)
    percentage?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    fixedAmount?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    thresholdAmount?: number;
}

export class CreatePayrollPolicyDto {
    @IsString()
    @IsNotEmpty()
    policyName: string;

    @IsEnum(PolicyType)
    @IsNotEmpty()
    policyType: PolicyType;

    @IsString()
    @IsOptional()
    description?: string;

    @IsNotEmpty()
    effectiveDate: Date;

    @ValidateNested()
    @Type(() => RuleDefinitionDto)
    @IsNotEmpty()
    ruleDefinition: RuleDefinitionDto;

    @IsEnum(Applicability)
    @IsNotEmpty()
    applicability: Applicability;
}

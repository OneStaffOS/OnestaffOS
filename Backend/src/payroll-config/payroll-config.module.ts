// src/payroll-config/payroll-config.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  PayrollPolicy,
  PayrollPolicySchema,
} from './models/payroll-policy.schema';
import { PayGrade, PayGradeSchema } from './models/pay-grade.schema';
import { PayType, PayTypeSchema } from './models/pay-type.schema';
import {
  AllowanceConfig,
  AllowanceConfigSchema,
} from './models/allowance-config.schema';
import {
  SigningBonusPolicy,
  SigningBonusPolicySchema,
} from './models/signing-bonus-policy.schema';
import {
  ExitBenefitPolicy,
  ExitBenefitPolicySchema,
} from './models/exit-benefit-policy.schema';
import { TaxRule, TaxRuleSchema } from './models/tax-rule.schema';
import {
  InsuranceBracket,
  InsuranceBracketSchema,
} from './models/insurance-bracket.schema';
import {
  CompanyPayrollSetting,
  CompanyPayrollSettingSchema,
} from './models/company-payroll-setting.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PayrollPolicy.name, schema: PayrollPolicySchema },
      { name: PayGrade.name, schema: PayGradeSchema },
      { name: PayType.name, schema: PayTypeSchema },
      { name: AllowanceConfig.name, schema: AllowanceConfigSchema },
      { name: SigningBonusPolicy.name, schema: SigningBonusPolicySchema },
      { name: ExitBenefitPolicy.name, schema: ExitBenefitPolicySchema },
      { name: TaxRule.name, schema: TaxRuleSchema },
      { name: InsuranceBracket.name, schema: InsuranceBracketSchema },
      { name: CompanyPayrollSetting.name, schema: CompanyPayrollSettingSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class PayrollConfigModule {}
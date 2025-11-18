// src/payroll-execution/payroll-execution.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  PayrollArea,
  PayrollAreaSchema,
} from './models/payroll-area.schema';
import {
  PayrollSchemaConfig,
  PayrollSchemaConfigSchema,
} from './models/payroll-schema-config.schema';
import {
  PayrollInitiation,
  PayrollInitiationSchema,
} from './models/payroll-initiation.schema';
import {
  SigningBonusInstance,
  SigningBonusInstanceSchema,
} from './models/signing-bonus-instance.schema';
import {
  ExitBenefitInstance,
  ExitBenefitInstanceSchema,
} from './models/exit-benefit-instance.schema';
import {
  PayrollRun,
  PayrollRunSchema,
} from './models/payroll-run.schema';
import {
  PayrollRunItem,
  PayrollRunItemSchema,
} from './models/payroll-run-item.schema';
import { Employee, EmployeeSchema } from '../employee/models/employee.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PayrollArea.name, schema: PayrollAreaSchema },
      { name: PayrollSchemaConfig.name, schema: PayrollSchemaConfigSchema },
      { name: PayrollInitiation.name, schema: PayrollInitiationSchema },
      { name: SigningBonusInstance.name, schema: SigningBonusInstanceSchema },
      { name: ExitBenefitInstance.name, schema: ExitBenefitInstanceSchema },
      { name: PayrollRun.name, schema: PayrollRunSchema },
      { name: PayrollRunItem.name, schema: PayrollRunItemSchema },
      { name: Employee.name, schema: EmployeeSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class PayrollExecutionModule {}
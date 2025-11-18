// src/payroll-tracking/payroll-tracking.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Payslip, PayslipSchema } from './models/payslip.schema';
import {
  PayrollDispute,
  PayrollDisputeSchema,
} from './models/payroll-dispute.schema';
import {
  ExpenseClaim,
  ExpenseClaimSchema,
} from './models/expense-claim.schema';
import {
  RefundRecord,
  RefundRecordSchema,
} from './models/refund-record.schema';
import { Employee, EmployeeSchema } from '../employee/models/employee.schema';
import {
  PayrollRun,
  PayrollRunSchema,
} from '../payroll-execution/models/payroll-run.schema';
import {
  PayrollRunItem,
  PayrollRunItemSchema,
} from '../payroll-execution/models/payroll-run-item.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payslip.name, schema: PayslipSchema },
      { name: PayrollDispute.name, schema: PayrollDisputeSchema },
      { name: ExpenseClaim.name, schema: ExpenseClaimSchema },
      { name: RefundRecord.name, schema: RefundRecordSchema },
      { name: Employee.name, schema: EmployeeSchema },
      { name: PayrollRun.name, schema: PayrollRunSchema },
      { name: PayrollRunItem.name, schema: PayrollRunItemSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class PayrollTrackingModule {}
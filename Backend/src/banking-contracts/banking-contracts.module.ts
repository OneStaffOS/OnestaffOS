import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BankingContractsController } from './banking-contracts.controller';
import { BankingContractsService } from './banking-contracts.service';
import { ServiceContract, ServiceContractSchema } from './models/service-contract.schema';
import { CompanyBalance, CompanyBalanceSchema } from './models/company-balance.schema';
import { EmployeeBalance, EmployeeBalanceSchema } from './models/employee-balance.schema';
import { BankingTransaction, BankingTransactionSchema } from './models/banking-transaction.schema';
import { BankingActorKey, BankingActorKeySchema } from './models/actor-key.schema';
import { BankingActionIntent, BankingActionIntentSchema } from './models/action-intent.schema';
import { BankingNonce, BankingNonceSchema } from './models/transaction-nonce.schema';
import { EmployeeProfile, EmployeeProfileSchema } from '../employee-profile/models/employee-profile.schema';
import { Department, DepartmentSchema } from '../organization-structure/models/department.schema';
import { payrollRuns, payrollRunsSchema } from '../payroll-execution/models/payrollRuns.schema';
import { employeePayrollDetails, employeePayrollDetailsSchema } from '../payroll-execution/models/employeePayrollDetails.schema';
import { NotificationModule } from '../notifications/notification.module';

@Module({
  imports: [
    NotificationModule,
    MongooseModule.forFeature([
      { name: ServiceContract.name, schema: ServiceContractSchema },
      { name: CompanyBalance.name, schema: CompanyBalanceSchema },
      { name: EmployeeBalance.name, schema: EmployeeBalanceSchema },
      { name: BankingTransaction.name, schema: BankingTransactionSchema },
      { name: BankingActorKey.name, schema: BankingActorKeySchema },
      { name: BankingActionIntent.name, schema: BankingActionIntentSchema },
      { name: BankingNonce.name, schema: BankingNonceSchema },
      { name: EmployeeProfile.name, schema: EmployeeProfileSchema },
      { name: Department.name, schema: DepartmentSchema },
      { name: payrollRuns.name, schema: payrollRunsSchema },
      { name: employeePayrollDetails.name, schema: employeePayrollDetailsSchema },
    ]),
  ],
  controllers: [BankingContractsController],
  providers: [BankingContractsService],
  exports: [BankingContractsService],
})
export class BankingContractsModule {}

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { BankingContractsService } from './banking-contracts.service';
import { ServiceContract } from './models/service-contract.schema';
import { CompanyBalance } from './models/company-balance.schema';
import { EmployeeBalance } from './models/employee-balance.schema';
import { BankingTransaction } from './models/banking-transaction.schema';
import { EmployeeProfile } from '../employee-profile/models/employee-profile.schema';
import { Department } from '../organization-structure/models/department.schema';
import { payrollRuns } from '../payroll-execution/models/payrollRuns.schema';
import { employeePayrollDetails } from '../payroll-execution/models/employeePayrollDetails.schema';
import { NotificationService } from '../notifications/notification.service';
import { ContractStatus, BankingTransactionType } from './enums/banking-contracts.enums';

describe('BankingContractsService', () => {
  let service: BankingContractsService;

  const departmentId = new Types.ObjectId();
  const headPositionId = new Types.ObjectId();

  const departmentModel = {
    findById: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue({
        _id: departmentId,
        name: 'Engineering',
        isActive: true,
        headPositionId,
      }),
    }),
  };

  const employeeProfileModel = {
    find: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([{ _id: new Types.ObjectId() }]),
    }),
  };

  const contractModel = {
    create: jest.fn().mockResolvedValue({ status: ContractStatus.PENDING }),
  };

  const companyBalanceModel = {
    findOne: jest.fn().mockReturnValue({
      session: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue({ balance: 250, lastUpdatedAt: new Date() }),
    }),
  };

  const transactionModel = {
    aggregate: jest.fn().mockResolvedValue([
      { _id: BankingTransactionType.CONTRACT_INCOME, total: 500 },
      { _id: BankingTransactionType.PAYROLL_EXPENSE, total: 120 },
    ]),
  };

  const notificationService = {
    createNotification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BankingContractsService,
        { provide: getModelToken(ServiceContract.name), useValue: contractModel },
        { provide: getModelToken(CompanyBalance.name), useValue: companyBalanceModel },
        { provide: getModelToken(EmployeeBalance.name), useValue: {} },
        { provide: getModelToken(BankingTransaction.name), useValue: transactionModel },
        { provide: getModelToken(EmployeeProfile.name), useValue: employeeProfileModel },
        { provide: getModelToken(Department.name), useValue: departmentModel },
        { provide: getModelToken(payrollRuns.name), useValue: {} },
        { provide: getModelToken(employeePayrollDetails.name), useValue: {} },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();

    service = module.get<BankingContractsService>(BankingContractsService);
  });

  it('creates a pending contract and notifies department heads', async () => {
    const clientId = new Types.ObjectId().toString();
    const result = await service.createContract(clientId, {
      requestedService: 'Mobile App',
      departmentId: departmentId.toString(),
      timeEstimateHours: 40,
      paymentAmount: 1500,
      description: 'New app build',
    });

    expect(contractModel.create).toHaveBeenCalled();
    expect(result.status).toBe(ContractStatus.PENDING);
    expect(notificationService.createNotification).toHaveBeenCalled();
  });

  it('returns company overview totals', async () => {
    const overview = await service.getCompanyOverview();
    expect(overview.balance).toBe(250);
    expect(overview.income).toBe(500);
    expect(overview.expenses).toBe(120);
  });
});

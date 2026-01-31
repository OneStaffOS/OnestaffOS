import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { AuthGuard } from './../src/auth/middleware/authentication.middleware';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import * as crypto from 'crypto';
import { Department } from '../src/organization-structure/models/department.schema';
import { Position } from '../src/organization-structure/models/position.schema';
import { EmployeeProfile } from '../src/employee-profile/models/employee-profile.schema';
import { ServiceContract } from '../src/banking-contracts/models/service-contract.schema';
import { CompanyBalance } from '../src/banking-contracts/models/company-balance.schema';
import { BankingTransaction } from '../src/banking-contracts/models/banking-transaction.schema';
import { EmployeeBalance } from '../src/banking-contracts/models/employee-balance.schema';
import { payrollRuns } from '../src/payroll-execution/models/payrollRuns.schema';
import { employeePayrollDetails } from '../src/payroll-execution/models/employeePayrollDetails.schema';
import { PayRollStatus, PayRollPaymentStatus, BankStatus } from '../src/payroll-execution/enums/payroll-execution-enum';

describe('BankingContracts (e2e)', () => {
  let app: INestApplication<App>;
  let departmentModel: any;
  let positionModel: any;
  let employeeProfileModel: any;
  let contractModel: any;
  let companyBalanceModel: any;
  let transactionModel: any;
  let employeeBalanceModel: any;
  let payrollRunsModel: any;
  let payrollDetailsModel: any;

  const csrfToken = 'test-csrf-token';
  const clientId = new Types.ObjectId();
  const headId = new Types.ObjectId();
  const employeeId = new Types.ObjectId();
  const financeId = new Types.ObjectId();
  const specialistId = new Types.ObjectId();

  const testUsers: Record<string, any> = {
    client: { employeeId: clientId.toString(), userId: clientId.toString(), roles: ['Client'] },
    head: { employeeId: headId.toString(), userId: headId.toString(), roles: ['department head'] },
    employee: { employeeId: employeeId.toString(), userId: employeeId.toString(), roles: ['department employee'] },
    finance: { employeeId: financeId.toString(), userId: financeId.toString(), roles: ['Finance Staff'] },
    system: { employeeId: financeId.toString(), userId: financeId.toString(), roles: ['System Admin'] },
  };

  const csrf = (req: request.Test) =>
    req.set('Cookie', `XSRF-TOKEN=${csrfToken}`).set('X-CSRF-TOKEN', csrfToken);

  beforeAll(async () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    process.env.BANKING_PUBLIC_KEY = publicKey;
    process.env.BANKING_PRIVATE_KEY = privateKey;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          const key = String(req.headers['x-test-user'] || 'client');
          req.user = testUsers[key] || testUsers.client;
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    departmentModel = moduleFixture.get(getModelToken(Department.name));
    positionModel = moduleFixture.get(getModelToken(Position.name));
    employeeProfileModel = moduleFixture.get(getModelToken(EmployeeProfile.name));
    contractModel = moduleFixture.get(getModelToken(ServiceContract.name));
    companyBalanceModel = moduleFixture.get(getModelToken(CompanyBalance.name));
    transactionModel = moduleFixture.get(getModelToken(BankingTransaction.name));
    employeeBalanceModel = moduleFixture.get(getModelToken(EmployeeBalance.name));
    payrollRunsModel = moduleFixture.get(getModelToken(payrollRuns.name));
    payrollDetailsModel = moduleFixture.get(getModelToken(employeePayrollDetails.name));

    const department = await departmentModel.create({
      code: 'ENG-001',
      name: 'Engineering',
      isActive: true,
    });
    const headPosition = await positionModel.create({
      code: 'ENG-HEAD',
      title: 'Head of Engineering',
      departmentId: department._id,
      isActive: true,
    });
    await departmentModel.findByIdAndUpdate(department._id, { headPositionId: headPosition._id });

    await employeeProfileModel.create([
      {
        _id: clientId,
        employeeNumber: 'C-100',
        dateOfHire: new Date(),
        firstName: 'Client',
        lastName: 'User',
        nationalId: 'CLIENT-001',
        status: 'ACTIVE',
        workEmail: 'client@test.local',
      },
      {
        _id: headId,
        employeeNumber: 'H-200',
        dateOfHire: new Date(),
        firstName: 'Head',
        lastName: 'User',
        nationalId: 'HEAD-001',
        status: 'ACTIVE',
        workEmail: 'head@test.local',
        primaryDepartmentId: department._id,
        primaryPositionId: headPosition._id,
      },
      {
        _id: employeeId,
        employeeNumber: 'E-300',
        dateOfHire: new Date(),
        firstName: 'Employee',
        lastName: 'User',
        nationalId: 'EMP-001',
        status: 'ACTIVE',
        workEmail: 'employee@test.local',
        primaryDepartmentId: department._id,
      },
      {
        _id: financeId,
        employeeNumber: 'F-400',
        dateOfHire: new Date(),
        firstName: 'Finance',
        lastName: 'User',
        nationalId: 'FIN-001',
        status: 'ACTIVE',
        workEmail: 'finance@test.local',
      },
      {
        _id: specialistId,
        employeeNumber: 'S-500',
        dateOfHire: new Date(),
        firstName: 'Payroll',
        lastName: 'Specialist',
        nationalId: 'PAY-001',
        status: 'ACTIVE',
        workEmail: 'payroll@test.local',
      },
    ]);
  });

  afterAll(async () => {
    await Promise.all([
      contractModel.deleteMany({}).exec(),
      transactionModel.deleteMany({}).exec(),
      companyBalanceModel.deleteMany({}).exec(),
      employeeBalanceModel.deleteMany({}).exec(),
      payrollDetailsModel.deleteMany({}).exec(),
      payrollRunsModel.deleteMany({}).exec(),
      employeeProfileModel.deleteMany({}).exec(),
      positionModel.deleteMany({}).exec(),
      departmentModel.deleteMany({}).exec(),
    ]);
    await app.close();
  });

  it('runs contract lifecycle and updates company balance', async () => {
    const createRes = await csrf(
      request(app.getHttpServer())
        .post('/api/v1/banking-contracts/contracts')
        .set('x-test-user', 'client')
        .send({
          requestedService: 'Analytics Dashboard',
          departmentId: (await departmentModel.findOne().exec())._id.toString(),
          timeEstimateHours: 80,
          paymentAmount: 5000,
        })
    );
    expect(createRes.status).toBe(201);
    const contractId = createRes.body._id;

    const activateRes = await csrf(
      request(app.getHttpServer())
        .post(`/api/v1/banking-contracts/contracts/${contractId}/activate`)
        .set('x-test-user', 'head')
        .send({})
    );
    expect(activateRes.status).toBe(201);

    const completionRes = await csrf(
      request(app.getHttpServer())
        .post(`/api/v1/banking-contracts/contracts/${contractId}/submit-completion`)
        .set('x-test-user', 'employee')
        .send({ note: 'Work completed' })
    );
    expect(completionRes.status).toBe(201);

    const completeRes = await csrf(
      request(app.getHttpServer())
        .post(`/api/v1/banking-contracts/contracts/${contractId}/complete`)
        .set('x-test-user', 'head')
        .send({})
    );
    expect(completeRes.status).toBe(201);

    const approveRes = await csrf(
      request(app.getHttpServer())
        .post(`/api/v1/banking-contracts/contracts/${contractId}/approve`)
        .set('x-test-user', 'client')
        .send({})
    );
    expect(approveRes.status).toBe(201);
    expect(approveRes.body.transaction.signature).toBeDefined();

    const overviewRes = await request(app.getHttpServer())
      .get('/api/v1/banking-contracts/banking/overview')
      .set('x-test-user', 'finance');
    expect(overviewRes.status).toBe(200);
    expect(overviewRes.body.balance).toBeGreaterThanOrEqual(5000);

    const txRes = await request(app.getHttpServer())
      .get('/api/v1/banking-contracts/banking/transactions')
      .set('x-test-user', 'finance');
    expect(txRes.status).toBe(200);
    expect(txRes.body[0].signatureValid).toBe(true);
  });

  it('blocks unauthorized contract approval', async () => {
    const contract = await contractModel.findOne().exec();
    const res = await csrf(
      request(app.getHttpServer())
        .post(`/api/v1/banking-contracts/contracts/${contract._id}/approve`)
        .set('x-test-user', 'employee')
        .send({})
    );
    expect(res.status).toBe(403);
  });

  it('records payroll payment and updates balances', async () => {
    const run = await payrollRunsModel.create({
      runId: 'PR-TEST-0001',
      payrollPeriod: new Date(),
      status: PayRollStatus.PENDING_FINANCE_APPROVAL,
      entity: 'OneStaff OS',
      employees: 1,
      exceptions: 0,
      totalnetpay: 2500,
      payrollSpecialistId: specialistId,
      paymentStatus: PayRollPaymentStatus.PENDING,
    });

    await payrollDetailsModel.create({
      employeeId,
      baseSalary: 3000,
      allowances: 0,
      deductions: 500,
      netSalary: 2500,
      netPay: 2500,
      bankStatus: BankStatus.VALID,
      payrollRunId: run._id,
    });

    const approveRes = await csrf(
      request(app.getHttpServer())
        .post(`/api/v1/payroll-execution/runs/${run._id}/finance-approve`)
        .set('x-test-user', 'finance')
        .send({})
    );
    expect(approveRes.status).toBe(201);

    const balanceRes = await request(app.getHttpServer())
      .get('/api/v1/banking-contracts/employee/balance')
      .set('x-test-user', 'employee');
    expect(balanceRes.status).toBe(200);
    expect(balanceRes.body.balance).toBeGreaterThanOrEqual(2500);

    const overviewRes = await request(app.getHttpServer())
      .get('/api/v1/banking-contracts/banking/overview')
      .set('x-test-user', 'finance');
    expect(overviewRes.status).toBe(200);
    expect(overviewRes.body.expenses).toBeGreaterThanOrEqual(2500);
  });
});

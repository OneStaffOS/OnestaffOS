import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { NotificationService } from '../notifications/notification.service';
import { EmployeeProfile, EmployeeProfileDocument } from '../employee-profile/models/employee-profile.schema';
import { Department, DepartmentDocument } from '../organization-structure/models/department.schema';
import { EmployeeStatus } from '../employee-profile/enums/employee-profile.enums';
import { payrollRuns, payrollRunsDocument } from '../payroll-execution/models/payrollRuns.schema';
import { employeePayrollDetails, employeePayrollDetailsDocument } from '../payroll-execution/models/employeePayrollDetails.schema';
import { ContractStatus, BankingTransactionType } from './enums/banking-contracts.enums';
import { ServiceContract, ServiceContractDocument } from './models/service-contract.schema';
import { CompanyBalance, CompanyBalanceDocument } from './models/company-balance.schema';
import { EmployeeBalance, EmployeeBalanceDocument } from './models/employee-balance.schema';
import { BankingTransaction, BankingTransactionDocument } from './models/banking-transaction.schema';
import { BankingActorKey, BankingActorKeyDocument } from './models/actor-key.schema';
import { BankingActionIntent, BankingActionIntentDocument } from './models/action-intent.schema';
import { BankingNonce, BankingNonceDocument } from './models/transaction-nonce.schema';
import { CreateContractDto } from './dto/create-contract.dto';
import { SubmitCompletionDto } from './dto/submit-completion.dto';
import { ListContractsDto } from './dto/list-contracts.dto';
import { ListTransactionsDto } from './dto/list-transactions.dto';
import { SignedActionDto, SignedTransactionPayloadDto } from './dto/signed-action.dto';
import { Role } from '../auth/decorators/roles.decorator';
import { RegisterActorKeyDto } from './dto/register-actor-key.dto';

type LegacyKeyCache = {
  publicKey: string;
  fingerprint: string;
  signatureVersion: number;
};

type LedgerKeyCache = {
  currentKey: string;
  previousKey?: string;
};

type VerifiedIntent = {
  payload: SignedTransactionPayloadDto;
  payloadHash: string;
  signature: string;
  actorKeyId: string;
  actorId: string;
  actorRole: string;
  action: string;
  txId: string;
  nonce: string;
  timestamp: Date;
};

const BANKING_ACTIONS = {
  CONTRACT_CREATE: 'CONTRACT_CREATE',
  CONTRACT_ACTIVATE: 'CONTRACT_ACTIVATE',
  CONTRACT_SUBMIT_COMPLETION: 'CONTRACT_SUBMIT_COMPLETION',
  CONTRACT_COMPLETE: 'CONTRACT_COMPLETE',
  CONTRACT_APPROVE: 'CONTRACT_APPROVE',
  PAYROLL_FINANCE_APPROVE: 'PAYROLL_FINANCE_APPROVE',
} as const;

@Injectable()
export class BankingContractsService {
  private readonly logger = new Logger(BankingContractsService.name);
  private legacyKeyCache?: LegacyKeyCache;
  private ledgerKeyCache?: LedgerKeyCache;

  constructor(
    @InjectModel(ServiceContract.name)
    private readonly contractModel: Model<ServiceContractDocument>,
    @InjectModel(CompanyBalance.name)
    private readonly companyBalanceModel: Model<CompanyBalanceDocument>,
    @InjectModel(EmployeeBalance.name)
    private readonly employeeBalanceModel: Model<EmployeeBalanceDocument>,
    @InjectModel(BankingTransaction.name)
    private readonly transactionModel: Model<BankingTransactionDocument>,
    @InjectModel(BankingActorKey.name)
    private readonly actorKeyModel: Model<BankingActorKeyDocument>,
    @InjectModel(BankingActionIntent.name)
    private readonly actionIntentModel: Model<BankingActionIntentDocument>,
    @InjectModel(BankingNonce.name)
    private readonly nonceModel: Model<BankingNonceDocument>,
    @InjectModel(EmployeeProfile.name)
    private readonly employeeProfileModel: Model<EmployeeProfileDocument>,
    @InjectModel(Department.name)
    private readonly departmentModel: Model<DepartmentDocument>,
    @InjectModel(payrollRuns.name)
    private readonly payrollRunsModel: Model<payrollRunsDocument>,
    @InjectModel(employeePayrollDetails.name)
    private readonly employeePayrollDetailsModel: Model<employeePayrollDetailsDocument>,
    private readonly notificationService: NotificationService,
  ) {}

  async createContract(clientId: string, roles: string[], dto: CreateContractDto & SignedActionDto) {
    const intent = await this.verifySignedAction(
      BANKING_ACTIONS.CONTRACT_CREATE,
      clientId,
      roles,
      dto,
      {
        amount: dto.paymentAmount,
        requireContractId: true,
      },
    );

    const contractObjectId = intent?.payload.contractId
      ? this.toObjectId(intent.payload.contractId, 'contractId')
      : undefined;

    const department = await this.departmentModel.findById(dto.departmentId).exec();
    if (!department || department.isActive === false) {
      throw new NotFoundException('Department not found');
    }

    const contract = await this.contractModel.create({
      ...(contractObjectId ? { _id: contractObjectId } : {}),
      clientId: new Types.ObjectId(clientId),
      departmentId: new Types.ObjectId(dto.departmentId),
      requestedService: dto.requestedService,
      description: dto.description,
      timeEstimateDays: dto.timeEstimateDays,
      paymentAmount: dto.paymentAmount,
      status: ContractStatus.PENDING,
    });

    const headEmployeeIds = await this.resolveDepartmentHeadEmployees(department._id);
    if (headEmployeeIds.length > 0) {
      await this.notificationService.createNotification(clientId, {
        title: 'New contract request',
        message: `A client submitted a new contract request for ${department.name}.`,
        targetEmployeeIds: headEmployeeIds.map((id) => id.toString()),
      });
    }

    return contract;
  }

  async registerActorKey(actorId: string, roles: string[], dto: RegisterActorKeyDto) {
    const normalizedRoles = roles.map((role) => this.normalizeRole(role));
    const requestedRole = this.normalizeRole(dto.actorRole);
    if (!normalizedRoles.includes(requestedRole) && !this.isSystemAdmin(roles)) {
      throw new ForbiddenException('Actor role mismatch');
    }
    if (dto.publicKeyJwk?.crv && dto.publicKeyJwk.crv !== 'Ed25519') {
      throw new BadRequestException('Only Ed25519 public keys are supported');
    }

    const actorObjectId = this.toObjectId(actorId, 'actorId');
    const existingLatest = await this.actorKeyModel
      .findOne({ actorId: actorObjectId, actorRole: dto.actorRole, keyStatus: 'ACTIVE' })
      .sort({ keyVersion: -1 })
      .exec();

    const nextVersion = dto.keyVersion || (existingLatest?.keyVersion || 0) + 1;

    await this.actorKeyModel.updateMany(
      { actorId: actorObjectId, actorRole: dto.actorRole, keyStatus: 'ACTIVE' },
      {
        $set: {
          isActive: false,
          keyStatus: 'REVOKED',
          revokedAt: new Date(),
        },
      },
    );

    const created = await this.actorKeyModel.create({
      actorId: actorObjectId,
      actorRole: dto.actorRole,
      keyId: dto.keyId,
      keyVersion: nextVersion,
      publicKeyJwk: dto.publicKeyJwk,
      algorithm: 'Ed25519',
      isActive: true,
      keyStatus: 'ACTIVE',
    });

    return {
      keyId: created.keyId,
      actorRole: created.actorRole,
      keyVersion: created.keyVersion,
    };
  }

  async getClientContracts(clientId: string) {
    return this.contractModel
      .find({ clientId: new Types.ObjectId(clientId) })
      .populate('departmentId', 'name')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getActiveContractsForEmployee(employeeId: string) {
    const profile = await this.getEmployeeProfile(employeeId);
    if (!profile.primaryDepartmentId) {
      return [];
    }

    return this.contractModel
      .find({
        departmentId: profile.primaryDepartmentId,
        status: ContractStatus.ACTIVE,
      })
      .populate('departmentId', 'name')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getDepartmentContracts(
    employeeId: string,
    roles: string[],
    query: ListContractsDto,
  ) {
    const profile = await this.getEmployeeProfile(employeeId);
    if (!profile.primaryDepartmentId) {
      throw new BadRequestException('Department not assigned');
    }

    const departmentId = profile.primaryDepartmentId.toString();
    await this.assertDepartmentHeadAccess(employeeId, departmentId, roles);

    const filter: Record<string, any> = {
      departmentId: profile.primaryDepartmentId,
    };
    if (query.status) {
      filter.status = query.status;
    }

    return this.contractModel
      .find(filter)
      .populate('clientId', 'firstName lastName')
      .populate('departmentId', 'name')
      .sort({ createdAt: -1 })
      .exec();
  }

  async activateContract(
    contractId: string,
    employeeId: string,
    roles: string[],
    signedAction: SignedActionDto,
  ) {
    const contract = await this.getContractOrThrow(contractId);
    await this.verifySignedAction(
      BANKING_ACTIONS.CONTRACT_ACTIVATE,
      employeeId,
      roles,
      signedAction,
      {
        contractId: contract._id.toString(),
        amount: contract.paymentAmount,
      },
    );
    await this.assertDepartmentHeadAccess(employeeId, contract.departmentId.toString(), roles);

    if (contract.status !== ContractStatus.PENDING) {
      throw new BadRequestException('Contract is not pending');
    }

    contract.status = ContractStatus.ACTIVE;
    contract.activatedAt = new Date();
    contract.activatedByEmployeeId = new Types.ObjectId(employeeId);
    await contract.save();

    await this.notificationService.createNotification(employeeId, {
      title: 'Contract activated',
      message: 'Your contract is now active and in progress.',
      targetEmployeeIds: [contract.clientId.toString()],
    });

    await this.notificationService.createNotification(employeeId, {
      title: 'New active contract',
      message: 'A new contract is now active for your department.',
      targetDepartmentIds: [contract.departmentId.toString()],
    });

    return contract;
  }

  async submitCompletionRequest(
    contractId: string,
    employeeId: string,
    roles: string[],
    dto: SubmitCompletionDto & SignedActionDto,
  ) {
    const contract = await this.getContractOrThrow(contractId);
    if (contract.status !== ContractStatus.ACTIVE) {
      throw new BadRequestException('Contract is not active');
    }

    await this.verifySignedAction(
      BANKING_ACTIONS.CONTRACT_SUBMIT_COMPLETION,
      employeeId,
      roles,
      dto,
      {
        contractId: contract._id.toString(),
        amount: contract.paymentAmount,
      },
    );

    await this.assertEmployeeDepartmentAccess(employeeId, contract.departmentId.toString(), roles);

    contract.status = ContractStatus.COMPLETION_REQUESTED;
    contract.completionRequestedAt = new Date();
    contract.completionRequests = contract.completionRequests || [];
    contract.completionRequests.push({
      employeeId: new Types.ObjectId(employeeId),
      note: dto.note,
      submittedAt: new Date(),
    });
    await contract.save();

    const headEmployeeIds = await this.resolveDepartmentHeadEmployees(contract.departmentId);
    if (headEmployeeIds.length > 0) {
      await this.notificationService.createNotification(employeeId, {
        title: 'Completion request submitted',
        message: 'An employee submitted a contract completion request.',
        targetEmployeeIds: headEmployeeIds.map((id) => id.toString()),
      });
    }

    return contract;
  }

  async completeContract(
    contractId: string,
    employeeId: string,
    roles: string[],
    signedAction: SignedActionDto,
  ) {
    const contract = await this.getContractOrThrow(contractId);
    await this.verifySignedAction(
      BANKING_ACTIONS.CONTRACT_COMPLETE,
      employeeId,
      roles,
      signedAction,
      {
        contractId: contract._id.toString(),
        amount: contract.paymentAmount,
      },
    );
    await this.assertDepartmentHeadAccess(employeeId, contract.departmentId.toString(), roles);

    if (contract.status !== ContractStatus.COMPLETION_REQUESTED) {
      throw new BadRequestException('Contract is not awaiting review');
    }

    contract.status = ContractStatus.COMPLETED;
    contract.completedAt = new Date();
    contract.completedByEmployeeId = new Types.ObjectId(employeeId);
    await contract.save();

    await this.notificationService.createNotification(employeeId, {
      title: 'Contract completed',
      message: 'Your contract has been marked as completed. Please review and approve.',
      targetEmployeeIds: [contract.clientId.toString()],
    });

    return contract;
  }

  async approveContract(
    contractId: string,
    clientId: string,
    roles: string[],
    signedAction: SignedActionDto,
  ) {
    const contract = await this.getContractOrThrow(contractId);
    const intent = await this.verifySignedAction(
      BANKING_ACTIONS.CONTRACT_APPROVE,
      clientId,
      roles,
      signedAction,
      {
        contractId: contract._id.toString(),
        amount: contract.paymentAmount,
      },
    );
    if (!this.isSystemAdmin(roles) && contract.clientId.toString() !== clientId) {
      throw new ForbiddenException('Only the contract client can approve');
    }
    if (contract.status !== ContractStatus.COMPLETED) {
      throw new BadRequestException('Contract is not completed');
    }

    const session = await this.companyBalanceModel.db.startSession();
    try {
      let transaction: BankingTransactionDocument | null = null;
      await session.withTransaction(async () => {
        contract.status = ContractStatus.APPROVED;
        contract.approvedAt = new Date();
        contract.approvedByClientId = new Types.ObjectId(clientId);
        await contract.save({ session });

        const companyBalance = await this.getOrCreateCompanyBalance(session);
        companyBalance.balance += contract.paymentAmount;
        companyBalance.lastUpdatedAt = new Date();
        transaction = await this.createTransaction(
          {
            transactionType: BankingTransactionType.CONTRACT_INCOME,
            amount: contract.paymentAmount,
            companyDelta: contract.paymentAmount,
            employeeDelta: 0,
            contractId: contract._id,
            description: 'Contract approved and funded',
            createdByEmployeeId: clientId,
            metadata: {
              contractStatus: contract.status,
            },
          },
          session,
          undefined,
          intent,
        );
        companyBalance.lastTransactionId = transaction._id;
        await companyBalance.save({ session });
      });

      await this.notificationService.createNotification(clientId, {
        title: 'Contract approved',
        message: 'Thank you for approving the completed contract.',
        targetEmployeeIds: [contract.clientId.toString()],
      });

      return { contract, transaction };
    } finally {
      session.endSession();
    }
  }

  async getCompanyOverview() {
    const companyBalance = await this.getOrCreateCompanyBalance();
    const totals = await this.transactionModel.aggregate([
      {
        $match: {
          transactionType: {
            $in: [BankingTransactionType.CONTRACT_INCOME, BankingTransactionType.PAYROLL_EXPENSE],
          },
        },
      },
      {
        $group: {
          _id: '$transactionType',
          total: { $sum: '$amount' },
        },
      },
    ]);

    const totalsMap = totals.reduce<Record<string, number>>((acc, entry) => {
      acc[entry._id] = entry.total;
      return acc;
    }, {});

    return {
      balance: companyBalance.balance,
      income: totalsMap[BankingTransactionType.CONTRACT_INCOME] || 0,
      expenses: totalsMap[BankingTransactionType.PAYROLL_EXPENSE] || 0,
      lastUpdatedAt: companyBalance.lastUpdatedAt,
    };
  }

  async listTransactions(query: ListTransactionsDto) {
    const filter: Record<string, any> = {};
    if (query.type) {
      filter.transactionType = query.type;
    }

    const transactions = await this.transactionModel
      .find(filter)
      .sort({ transactionAt: -1 })
      .exec();

    return Promise.all(
      transactions.map(async (transaction) => {
        const isLegacy =
          transaction.cryptoStatus === 'LEGACY' ||
          transaction.signatureVersion === 1 ||
          !transaction.signatureVersion;
        const cryptoStatus = transaction.cryptoStatus || (isLegacy ? 'LEGACY' : 'ACTIVE');
        const legacyAlgorithm =
          transaction.legacyAlgorithm || (cryptoStatus === 'LEGACY' ? 'RSA-2048-SHA256' : undefined);
        return {
          ...transaction.toObject(),
          cryptoStatus,
          legacyAlgorithm,
          signatureValid: await this.verifyTransactionIntegrity(transaction),
        };
      }),
    );
  }

  async getEmployeeBalance(employeeId: string) {
    const balance = await this.getOrCreateEmployeeBalance(employeeId);
    const transactions = await this.transactionModel
      .find({
        employeeId: new Types.ObjectId(employeeId),
        transactionType: BankingTransactionType.EMPLOYEE_WAGE_CREDIT,
      })
      .sort({ transactionAt: -1 })
      .exec();

    return {
      balance: balance.balance,
      lastUpdatedAt: balance.lastUpdatedAt,
      transactions: await Promise.all(
        transactions.map(async (transaction) => {
          const isLegacy =
            transaction.cryptoStatus === 'LEGACY' ||
            transaction.signatureVersion === 1 ||
            !transaction.signatureVersion;
          const cryptoStatus = transaction.cryptoStatus || (isLegacy ? 'LEGACY' : 'ACTIVE');
          const legacyAlgorithm =
            transaction.legacyAlgorithm || (cryptoStatus === 'LEGACY' ? 'RSA-2048-SHA256' : undefined);
          return {
            ...transaction.toObject(),
            cryptoStatus,
            legacyAlgorithm,
            signatureValid: await this.verifyTransactionIntegrity(transaction),
          };
        }),
      ),
    };
  }

  async recordPayrollPayment(
    runId: string,
    financeStaffId: string,
    roles: string[],
    signedAction: SignedActionDto,
  ) {
    const existing = await this.transactionModel.findOne({
      payrollRunId: new Types.ObjectId(runId),
      transactionType: BankingTransactionType.PAYROLL_EXPENSE,
    }).exec();

    if (existing) {
      return { alreadyProcessed: true, transactionId: existing.transactionId };
    }

    const run = await this.payrollRunsModel.findById(runId).exec();
    if (!run) {
      throw new NotFoundException('Payroll run not found');
    }

    const payrollDetails = await this.employeePayrollDetailsModel
      .find({ payrollRunId: run._id })
      .exec();

    if (payrollDetails.length === 0) {
      throw new BadRequestException('No payroll details found for run');
    }

    const totalNetPay = payrollDetails.reduce((sum, detail) => sum + (detail.netPay || 0), 0);
    const intent = await this.verifySignedAction(
      BANKING_ACTIONS.PAYROLL_FINANCE_APPROVE,
      financeStaffId,
      roles,
      signedAction,
      {
        amount: totalNetPay,
        requireContractId: false,
      },
    );
    const session = await this.companyBalanceModel.db.startSession();
    try {
      let expenseTransaction: BankingTransactionDocument | null = null;
      const expenseTransactionId = this.generateTransactionId();
      await session.withTransaction(async () => {
        const companyBalance = await this.getOrCreateCompanyBalance(session);
        companyBalance.balance -= totalNetPay;
        companyBalance.lastUpdatedAt = new Date();

        const transactionAt = new Date();
        for (const detail of payrollDetails) {
          const employeeId = detail.employeeId.toString();
          await this.employeeBalanceModel.findOneAndUpdate(
            { employeeId: detail.employeeId },
            {
              $inc: { balance: detail.netPay || 0 },
              $set: { lastUpdatedAt: transactionAt },
            },
            { upsert: true, new: true, session },
          );

          await this.createTransaction(
            {
              transactionType: BankingTransactionType.EMPLOYEE_WAGE_CREDIT,
              amount: detail.netPay || 0,
              companyDelta: 0,
              employeeDelta: detail.netPay || 0,
              employeeId,
              payrollRunId: run._id,
              description: 'Payroll wage credit',
              createdByEmployeeId: financeStaffId,
            },
            session,
            transactionAt,
            intent,
          );
        }

        expenseTransaction = await this.createTransaction(
          {
            transactionType: BankingTransactionType.PAYROLL_EXPENSE,
            amount: totalNetPay,
            companyDelta: -totalNetPay,
            employeeDelta: 0,
            payrollRunId: run._id,
            transactionId: expenseTransactionId,
            description: 'Payroll disbursement',
            createdByEmployeeId: financeStaffId,
          },
          session,
          transactionAt,
          intent,
        );

        companyBalance.lastTransactionId = expenseTransaction._id;
        await companyBalance.save({ session });
      });

      return {
        payrollRunId: run._id,
        totalNetPay,
        transactionId: expenseTransactionId,
      };
    } finally {
      session.endSession();
    }
  }

  private async resolveDepartmentHeadEmployees(departmentId: Types.ObjectId) {
    const department = await this.departmentModel
      .findById(departmentId)
      .select('headPositionId')
      .exec();
    if (!department?.headPositionId) {
      return [];
    }

    const heads = await this.employeeProfileModel
      .find({
        primaryPositionId: department.headPositionId,
        status: EmployeeStatus.ACTIVE,
      })
      .select('_id')
      .exec();

    return heads.map((head) => head._id as Types.ObjectId);
  }

  private async getContractOrThrow(contractId: string) {
    const contract = await this.contractModel.findById(contractId).exec();
    if (!contract) {
      throw new NotFoundException('Contract not found');
    }
    return contract;
  }

  private async getEmployeeProfile(employeeId: string) {
    const profile = await this.employeeProfileModel
      .findById(new Types.ObjectId(employeeId))
      .select('primaryDepartmentId primaryPositionId')
      .exec();
    if (!profile) {
      throw new NotFoundException('Employee profile not found');
    }
    return profile;
  }

  private async assertDepartmentHeadAccess(employeeId: string, departmentId: string, roles: string[]) {
    if (this.isSystemAdmin(roles)) {
      return;
    }

    const profile = await this.employeeProfileModel
      .findById(new Types.ObjectId(employeeId))
      .select('primaryPositionId primaryDepartmentId')
      .exec();
    if (!profile) {
      throw new ForbiddenException('Department head access required');
    }

    const normalizedRoles = roles.map((role) => this.normalizeRole(role));
    const hasDepartmentHeadRole = normalizedRoles.includes(this.normalizeRole(Role.DEPARTMENT_HEAD));
    if (hasDepartmentHeadRole) {
      if (profile.primaryDepartmentId?.toString() === departmentId) {
        return;
      }
      throw new ForbiddenException('Department head access required');
    }

    const department = await this.departmentModel
      .findById(new Types.ObjectId(departmentId))
      .select('headPositionId')
      .exec();
    if (!department?.headPositionId) {
      throw new ForbiddenException('Department head access required');
    }

    if (!department.headPositionId.equals(profile.primaryPositionId)) {
      throw new ForbiddenException('Department head access required');
    }
  }

  private async assertEmployeeDepartmentAccess(employeeId: string, departmentId: string, roles: string[]) {
    if (this.isSystemAdmin(roles)) {
      return;
    }

    const profile = await this.employeeProfileModel
      .findById(new Types.ObjectId(employeeId))
      .select('primaryDepartmentId')
      .exec();
    if (!profile?.primaryDepartmentId) {
      throw new ForbiddenException('Department access required');
    }

    if (profile.primaryDepartmentId.toString() !== departmentId) {
      throw new ForbiddenException('Department access required');
    }
  }

  private isSystemAdmin(roles: string[]) {
    const normalized = roles.map((role) => this.normalizeRole(role));
    return normalized.includes(this.normalizeRole(Role.SYSTEM_ADMIN));
  }

  private normalizeRole(role: string) {
    return String(role || '')
      .replace(/[_\-]+/g, ' ')
      .replace(/[^a-zA-Z0-9 ]+/g, '')
      .trim()
      .toLowerCase();
  }

  private getMigrationCutoff() {
    const raw = process.env.BANKING_MIGRATION_CUTOFF;
    if (!raw) {
      return new Date(0);
    }
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Invalid BANKING_MIGRATION_CUTOFF value');
    }
    return parsed;
  }

  private shouldEnforceSignedActions(now: Date) {
    return now.getTime() >= this.getMigrationCutoff().getTime();
  }

  private getLegacyKeyConfig(): LegacyKeyCache {
    if (this.legacyKeyCache) {
      return this.legacyKeyCache;
    }

    const signatureVersion = 1;
    const publicKeyEnv = process.env.BANKING_PUBLIC_KEY;
    if (publicKeyEnv) {
      const fingerprint = this.fingerprintKey(publicKeyEnv);
      this.legacyKeyCache = { publicKey: publicKeyEnv, fingerprint, signatureVersion };
      return this.legacyKeyCache;
    }

    const keysPath = process.env.BANKING_KEYS_PATH || path.join(process.cwd(), '.banking-keys');
    const publicKeyPath = path.join(keysPath, 'banking_rsa_public.pem');
    if (!fs.existsSync(publicKeyPath)) {
      throw new BadRequestException('Legacy banking public key not configured');
    }

    const publicKey = fs.readFileSync(publicKeyPath, 'utf8');
    const fingerprint = this.fingerprintKey(publicKey);
    this.legacyKeyCache = { publicKey, fingerprint, signatureVersion };
    return this.legacyKeyCache;
  }

  private getLedgerKeyConfig(): LedgerKeyCache {
    if (this.ledgerKeyCache) {
      return this.ledgerKeyCache;
    }
    const currentKey = process.env.BANKING_LEDGER_HMAC_KEY;
    if (!currentKey) {
      throw new BadRequestException('BANKING_LEDGER_HMAC_KEY is required');
    }
    const previousKey = process.env.BANKING_LEDGER_HMAC_KEY_OLD || undefined;
    this.ledgerKeyCache = { currentKey, previousKey };
    return this.ledgerKeyCache;
  }

  private fingerprintKey(publicKey: string) {
    return crypto.createHash('sha256').update(publicKey).digest('hex').slice(0, 16);
  }

  private buildLegacyPayload(transaction: {
    transactionId: string;
    transactionType: BankingTransactionType;
    amount: number;
    companyDelta: number;
    employeeDelta: number;
    employeeId?: Types.ObjectId | string;
    contractId?: Types.ObjectId | string;
    payrollRunId?: Types.ObjectId | string;
    description?: string;
    transactionAt: Date;
    createdByEmployeeId?: Types.ObjectId | string;
    signatureVersion: number;
  }) {
    return {
      transactionId: transaction.transactionId,
      transactionType: transaction.transactionType,
      amount: transaction.amount,
      companyDelta: transaction.companyDelta,
      employeeDelta: transaction.employeeDelta,
      employeeId: transaction.employeeId ? String(transaction.employeeId) : undefined,
      contractId: transaction.contractId ? String(transaction.contractId) : undefined,
      payrollRunId: transaction.payrollRunId ? String(transaction.payrollRunId) : undefined,
      description: transaction.description,
      transactionAt: transaction.transactionAt.toISOString(),
      createdByEmployeeId: transaction.createdByEmployeeId
        ? String(transaction.createdByEmployeeId)
        : undefined,
      signatureVersion: transaction.signatureVersion,
    };
  }

  private hashPayload(payload: Record<string, any>) {
    const serialized = this.stableStringify(payload);
    return crypto.createHash('sha256').update(serialized).digest('hex');
  }

  private stableStringify(value: any): string {
    if (Array.isArray(value)) {
      return `[${value.map((item) => this.stableStringify(item)).join(',')}]`;
    }
    if (value && typeof value === 'object') {
      const keys = Object.keys(value).filter((key) => value[key] !== undefined).sort();
      const entries = keys.map((key) => `${JSON.stringify(key)}:${this.stableStringify(value[key])}`);
      return `{${entries.join(',')}}`;
    }
    return JSON.stringify(value);
  }

  private toObjectId(value: string, fieldName: string) {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`Invalid ${fieldName}`);
    }
    return new Types.ObjectId(value);
  }

  private async resolveActorKey(
    actorId: string,
    actorKeyId: string,
    actorRole: string,
    timestamp: Date,
  ) {
    const actorObjectId = this.toObjectId(actorId, 'actorId');
    const actorKey = await this.actorKeyModel
      .findOne({ actorId: actorObjectId, keyId: actorKeyId, actorRole })
      .exec();

    if (!actorKey || actorKey.algorithm !== 'Ed25519') {
      throw new ForbiddenException('Actor key not found or invalid');
    }

    if (!actorKey.keyStatus || actorKey.keyStatus === 'LEGACY') {
      throw new ForbiddenException('Legacy actor key is not allowed');
    }

    if (actorKey.keyStatus !== 'ACTIVE') {
      throw new ForbiddenException('Actor key is not active');
    }

    if (!actorKey.isActive && (!actorKey.revokedAt || timestamp >= actorKey.revokedAt)) {
      throw new ForbiddenException('Actor key is not active');
    }

    if (actorKey.revokedAt && timestamp >= actorKey.revokedAt) {
      throw new ForbiddenException('Actor key has been revoked');
    }

    return actorKey;
  }

  private async verifyEd25519Signature(payloadHash: string, signature: string, publicKeyJwk: Record<string, any>) {
    const key = await crypto.webcrypto.subtle.importKey(
      'jwk',
      publicKeyJwk,
      { name: 'Ed25519' },
      true,
      ['verify'],
    );
    const signatureBytes = Buffer.from(signature, 'base64');
    const message = Buffer.from(payloadHash, 'hex');
    return crypto.webcrypto.subtle.verify('Ed25519', key, signatureBytes, message);
  }

  private async reserveIntent(
    payload: SignedTransactionPayloadDto,
    payloadHash: string,
    actorId: string,
    timestamp: Date,
    session?: any,
  ) {
    const actorObjectId = this.toObjectId(actorId, 'actorId');
    const expiresAt = new Date(timestamp.getTime() + 10 * 60 * 1000);

    try {
      await this.nonceModel.create(
        [
          {
            nonce: payload.nonce,
            actorId: actorObjectId,
            txId: payload.txId,
            expiresAt,
          },
        ],
        { session },
      );
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new ConflictException('Replay detected (nonce already used)');
      }
      throw error;
    }

    try {
      await this.actionIntentModel.create(
        [
          {
            txId: payload.txId,
            actorId: actorObjectId,
            actorRole: payload.actorRole,
            action: payload.action,
            contractId: payload.contractId ? this.toObjectId(payload.contractId, 'contractId') : undefined,
            payloadHash,
            nonce: payload.nonce,
            payloadTimestamp: timestamp,
          },
        ],
        { session },
      );
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new ConflictException('Transaction already processed');
      }
      throw error;
    }
  }

  private async verifySignedAction(
    expectedAction: string,
    actorId: string,
    roles: string[],
    signedAction: SignedActionDto | undefined,
    options: {
      contractId?: string;
      amount?: number;
      requireContractId?: boolean;
      session?: any;
    },
  ): Promise<VerifiedIntent | undefined> {
    const now = new Date();
    const enforce = this.shouldEnforceSignedActions(now);
    if (!signedAction?.payload || !signedAction.signature || !signedAction.actorKeyId) {
      if (enforce) {
        throw new BadRequestException('Signed transaction payload is required');
      }
      return undefined;
    }

    const payload = signedAction.payload;
    if (!payload.txId || !payload.nonce) {
      throw new BadRequestException('txId and nonce are required');
    }
    if (payload.action !== expectedAction) {
      throw new BadRequestException('Signed action does not match request');
    }
    if (payload.actorId !== actorId) {
      throw new ForbiddenException('Actor mismatch');
    }

    const normalizedRoles = roles.map((role) => this.normalizeRole(role));
    const payloadRole = this.normalizeRole(payload.actorRole);
    if (!normalizedRoles.includes(payloadRole) && !this.isSystemAdmin(roles)) {
      throw new ForbiddenException('Actor role mismatch');
    }

    if (options.requireContractId && !payload.contractId) {
      throw new BadRequestException('contractId is required for this action');
    }
    if (options.contractId && payload.contractId !== options.contractId) {
      throw new BadRequestException('contractId mismatch');
    }
    if (options.amount !== undefined && payload.amount !== options.amount) {
      throw new BadRequestException('amount mismatch');
    }

    const timestamp = new Date(payload.timestamp);
    if (Number.isNaN(timestamp.getTime())) {
      throw new BadRequestException('Invalid timestamp');
    }
    const driftMs = Math.abs(now.getTime() - timestamp.getTime());
    if (driftMs > 5 * 60 * 1000) {
      throw new ForbiddenException('Timestamp outside allowed window');
    }

    const payloadHash = this.hashPayload(payload);
    const actorKey = await this.resolveActorKey(
      actorId,
      signedAction.actorKeyId,
      payload.actorRole,
      timestamp,
    );
    const signatureValid = await this.verifyEd25519Signature(
      payloadHash,
      signedAction.signature,
      actorKey.publicKeyJwk,
    );
    if (!signatureValid) {
      throw new ForbiddenException('Invalid signature');
    }

    await this.reserveIntent(payload, payloadHash, actorId, timestamp, options.session);

    return {
      payload,
      payloadHash,
      signature: signedAction.signature,
      actorKeyId: signedAction.actorKeyId,
      actorId,
      actorRole: payload.actorRole,
      action: payload.action,
      txId: payload.txId,
      nonce: payload.nonce,
      timestamp,
    };
  }

  private computeLedgerHmac(payloadHash: string, previousHash: string, key: string) {
    return crypto.createHmac('sha256', key).update(`${previousHash}.${payloadHash}`).digest('hex');
  }

  private async getLatestLedgerHash(session?: any) {
    const latest = await this.transactionModel
      .findOne({ cryptoStatus: 'ACTIVE' })
      .sort({ transactionAt: -1 })
      .session(session)
      .exec();
    return latest?.ledgerHmac || 'GENESIS';
  }

  private verifyLedgerHmac(transaction: BankingTransactionDocument) {
    if (!transaction.ledgerHmac || !transaction.previousTransactionHash || !transaction.payloadHash) {
      return false;
    }
    const keys = this.getLedgerKeyConfig();
    const expectedCurrent = this.computeLedgerHmac(
      transaction.payloadHash,
      transaction.previousTransactionHash,
      keys.currentKey,
    );
    if (expectedCurrent === transaction.ledgerHmac) {
      return true;
    }
    if (keys.previousKey) {
      const expectedOld = this.computeLedgerHmac(
        transaction.payloadHash,
        transaction.previousTransactionHash,
        keys.previousKey,
      );
      return expectedOld === transaction.ledgerHmac;
    }
    return false;
  }

  private verifyLegacyTransactionSignature(transaction: BankingTransactionDocument) {
    try {
      const { publicKey } = this.getLegacyKeyConfig();
      if (!transaction.payloadHash || !transaction.signature) {
        return false;
      }
      return crypto.verify(
        'sha256',
        Buffer.from(transaction.payloadHash, 'hex'),
        publicKey,
        Buffer.from(transaction.signature, 'base64'),
      );
    } catch (error) {
      this.logger.warn('Legacy transaction signature verification failed', error as Error);
      return false;
    }
  }

  private async verifyTransactionIntegrity(transaction: BankingTransactionDocument) {
    const isLegacy =
      transaction.cryptoStatus === 'LEGACY' ||
      transaction.signatureVersion === 1 ||
      !transaction.signatureVersion;
    if (isLegacy) {
      return this.verifyLegacyTransactionSignature(transaction);
    }

    if (!transaction.payloadHash || !transaction.actorSignature || !transaction.actorId || !transaction.actorKeyId) {
      return false;
    }

    const ledgerValid = this.verifyLedgerHmac(transaction);
    if (!ledgerValid) {
      return false;
    }

    const actorKey = await this.actorKeyModel
      .findOne({
        actorId: transaction.actorId,
        keyId: transaction.actorKeyId,
        actorRole: transaction.actorRole,
      })
      .exec();
    if (!actorKey?.publicKeyJwk) {
      return false;
    }
    if (!actorKey.keyStatus || actorKey.keyStatus !== 'ACTIVE') {
      return false;
    }

    return this.verifyEd25519Signature(
      transaction.payloadHash,
      transaction.actorSignature,
      actorKey.publicKeyJwk,
    );
  }

  private generateTransactionId() {
    return `TX-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  private async createTransaction(
    data: {
      transactionType: BankingTransactionType;
      amount: number;
      companyDelta: number;
      employeeDelta: number;
      employeeId?: string;
      contractId?: Types.ObjectId;
      payrollRunId?: Types.ObjectId;
      description?: string;
      createdByEmployeeId?: string;
      metadata?: Record<string, any>;
      transactionId?: string;
    },
    session?: any,
    transactionAt?: Date,
    intent?: VerifiedIntent,
  ) {
    const transactionId = data.transactionId ?? this.generateTransactionId();
    const transactionTime = transactionAt || new Date();
    const requiresSigned = this.shouldEnforceSignedActions(transactionTime);
    if (requiresSigned && !intent) {
      throw new ForbiddenException('Signed intent is required for transaction creation');
    }

    const cryptoStatus = intent ? 'ACTIVE' : 'LEGACY';
    const signatureVersion = intent ? 2 : 1;
    const payloadHash = intent
      ? intent.payloadHash
      : this.hashPayload(
          this.buildLegacyPayload({
            transactionId,
            transactionType: data.transactionType,
            amount: data.amount,
            companyDelta: data.companyDelta,
            employeeDelta: data.employeeDelta,
            employeeId: data.employeeId,
            contractId: data.contractId,
            payrollRunId: data.payrollRunId,
            description: data.description,
            transactionAt: transactionTime,
            createdByEmployeeId: data.createdByEmployeeId,
            signatureVersion,
          }),
        );

    const previousTransactionHash = intent ? await this.getLatestLedgerHash(session) : undefined;
    const ledgerHmac = intent
      ? this.computeLedgerHmac(payloadHash, previousTransactionHash || 'GENESIS', this.getLedgerKeyConfig().currentKey)
      : undefined;

    const doc = new this.transactionModel({
      transactionId,
      transactionType: data.transactionType,
      amount: data.amount,
      companyDelta: data.companyDelta,
      employeeDelta: data.employeeDelta,
      employeeId: data.employeeId ? new Types.ObjectId(data.employeeId) : undefined,
      contractId: data.contractId,
      payrollRunId: data.payrollRunId,
      description: data.description,
      transactionAt: transactionTime,
      txId: intent?.txId,
      action: intent?.action,
      actorRole: intent?.actorRole,
      actorId: intent?.actorId ? new Types.ObjectId(intent.actorId) : undefined,
      actorKeyId: intent?.actorKeyId,
      actorSignature: intent?.signature,
      nonce: intent?.nonce,
      intentTimestamp: intent?.timestamp,
      cryptoStatus,
      legacyAlgorithm: intent ? undefined : 'RSA-2048-SHA256',
      payloadHash,
      previousTransactionHash,
      ledgerHmac,
      signatureVersion,
      createdByEmployeeId: data.createdByEmployeeId
        ? new Types.ObjectId(data.createdByEmployeeId)
        : undefined,
      metadata: data.metadata,
    });

    await doc.save({ session });
    return doc;
  }

  private async getOrCreateCompanyBalance(session?: any) {
    const existing = await this.companyBalanceModel.findOne().session(session).exec();
    if (existing) {
      return existing;
    }
    const created = new this.companyBalanceModel({
      balance: 0,
      lastUpdatedAt: new Date(),
    });
    await created.save({ session });
    return created;
  }

  private async getOrCreateEmployeeBalance(employeeId: string) {
    const existing = await this.employeeBalanceModel.findOne({
      employeeId: new Types.ObjectId(employeeId),
    }).exec();
    if (existing) {
      return existing;
    }
    const created = new this.employeeBalanceModel({
      employeeId: new Types.ObjectId(employeeId),
      balance: 0,
      lastUpdatedAt: new Date(),
    });
    await created.save();
    return created;
  }
}

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { payrollRuns, payrollRunsDocument } from './models/payrollRuns.schema';
import { paySlip, PayslipDocument } from './models/payslip.schema';
import { employeePayrollDetails, employeePayrollDetailsDocument } from './models/employeePayrollDetails.schema';
import { employeeSigningBonus, employeeSigningBonusDocument } from './models/EmployeeSigningBonus.schema';
import { EmployeeTerminationResignation, EmployeeTerminationResignationDocument } from './models/EmployeeTerminationResignation.schema';
import { employeePenalties, employeePenaltiesDocument } from './models/employeePenalties.schema';
import { PayRollStatus, PayRollPaymentStatus, BonusStatus, BenefitStatus } from './enums/payroll-execution-enum';
import { CreatePayrollRunDto } from './dto/create-payroll-run.dto';

@Injectable()
export class PayrollExecutionService {
    constructor(
        @InjectModel(payrollRuns.name) private payrollRunsModel: Model<payrollRunsDocument>,
        @InjectModel(paySlip.name) private paySlipModel: Model<PayslipDocument>,
        @InjectModel(employeePayrollDetails.name) private employeePayrollDetailsModel: Model<employeePayrollDetailsDocument>,
        @InjectModel(employeeSigningBonus.name) private employeeSigningBonusModel: Model<employeeSigningBonusDocument>,
        @InjectModel(EmployeeTerminationResignation.name) private employeeTerminationModel: Model<EmployeeTerminationResignationDocument>,
        @InjectModel(employeePenalties.name) private employeePenaltiesModel: Model<employeePenaltiesDocument>,
    ) {}

    // =====================================================
    // PHASE 0: Pre-Run Reviews - Signing Bonuses
    // =====================================================

    async getPendingSigningBonuses(): Promise<employeeSigningBonus[]> {
        return await this.employeeSigningBonusModel.find({ status: BonusStatus.PENDING })
            .populate('employeeId', 'firstName lastName')
            .exec();
    }

    async approveSigningBonus(bonusId: string, approverId: string): Promise<employeeSigningBonus> {
        const bonus = await this.employeeSigningBonusModel.findById(bonusId);
        if (!bonus) {
            throw new NotFoundException('Signing bonus not found');
        }

        if (bonus.status !== BonusStatus.PENDING) {
            throw new BadRequestException('Can only approve pending signing bonuses');
        }

        bonus.status = BonusStatus.APPROVED;
        return await bonus.save();
    }

    async rejectSigningBonus(bonusId: string, approverId: string): Promise<employeeSigningBonus> {
        const bonus = await this.employeeSigningBonusModel.findById(bonusId);
        if (!bonus) {
            throw new NotFoundException('Signing bonus not found');
        }

        if (bonus.status !== BonusStatus.PENDING) {
            throw new BadRequestException('Can only reject pending signing bonuses');
        }

        bonus.status = BonusStatus.REJECTED;
        return await bonus.save();
    }

    // =====================================================
    // PHASE 0: Pre-Run Reviews - Termination Benefits
    // =====================================================

    async getPendingTerminationBenefits(): Promise<EmployeeTerminationResignation[]> {
        return await this.employeeTerminationModel.find({ status: BenefitStatus.PENDING })
            .populate('employeeId', 'firstName lastName')
            .exec();
    }

    async approveTerminationBenefits(benefitId: string, approverId: string): Promise<EmployeeTerminationResignation> {
        const benefit = await this.employeeTerminationModel.findById(benefitId);
        if (!benefit) {
            throw new NotFoundException('Termination benefit not found');
        }

        if (benefit.status !== BenefitStatus.PENDING) {
            throw new BadRequestException('Can only approve pending termination benefits');
        }

        benefit.status = BenefitStatus.APPROVED;
        return await benefit.save();
    }

    async rejectTerminationBenefits(benefitId: string, approverId: string): Promise<EmployeeTerminationResignation> {
        const benefit = await this.employeeTerminationModel.findById(benefitId);
        if (!benefit) {
            throw new NotFoundException('Termination benefit not found');
        }

        if (benefit.status !== BenefitStatus.PENDING) {
            throw new BadRequestException('Can only reject pending termination benefits');
        }

        benefit.status = BenefitStatus.REJECTED;
        return await benefit.save();
    }

    // =====================================================
    // PHASE 1: Payroll Run Initiation
    // =====================================================

    async createPayrollRun(dto: CreatePayrollRunDto, createdById: string): Promise<payrollRuns> {
        // Generate unique runId
        const runCount = await this.payrollRunsModel.countDocuments();
        const runId = `PR-${new Date().getFullYear()}-${String(runCount + 1).padStart(4, '0')}`;

        const newRun = new this.payrollRunsModel({
            runId,
            payrollPeriod: dto.payrollPeriod,
            entity: dto.entity,
            employees: dto.employees || [],
            status: PayRollStatus.DRAFT,
            paymentStatus: PayRollPaymentStatus.PENDING,
            payrollSpecialistId: new Types.ObjectId(createdById),
        });

        return await newRun.save();
    }

    async getAllPayrollRuns(status?: PayRollStatus): Promise<payrollRuns[]> {
        const filter = status ? { status } : {};
        return await this.payrollRunsModel.find(filter)
            .populate('payrollSpecialistId', 'firstName lastName')
            .populate('payrollManagerId', 'firstName lastName')
            .populate('financeStaffId', 'firstName lastName')
            .sort({ createdAt: -1 })
            .exec();
    }

    async getPayrollRunById(runId: string): Promise<payrollRuns> {
        const run = await this.payrollRunsModel.findById(runId)
            .populate('payrollSpecialistId', 'firstName lastName')
            .populate('payrollManagerId', 'firstName lastName')
            .populate('financeStaffId', 'firstName lastName')
            .populate('employees', 'firstName lastName employeeCode')
            .exec();
        
        if (!run) {
            throw new NotFoundException('Payroll run not found');
        }
        return run;
    }

    // =====================================================
    // PHASE 2: Review and Flag Exceptions
    // =====================================================

    async flagExceptions(runId: string): Promise<payrollRuns> {
        const run = await this.payrollRunsModel.findById(runId);
        if (!run) {
            throw new NotFoundException('Payroll run not found');
        }

        // Note: employees is stored as a count (number) in the schema
        // Exception flagging would need employee list passed separately or schema redesign
        return run;
    }

    // =====================================================
    // PHASE 3: Multi-Level Approval Workflow
    // =====================================================

    async publishForReview(runId: string): Promise<payrollRuns> {
        const run = await this.payrollRunsModel.findById(runId);
        if (!run) {
            throw new NotFoundException('Payroll run not found');
        }

        if (run.status !== PayRollStatus.DRAFT) {
            throw new BadRequestException('Can only publish draft payroll runs');
        }

        run.status = PayRollStatus.UNDER_REVIEW;
        return await run.save();
    }

    async managerApprovePayroll(runId: string, managerId: string): Promise<payrollRuns> {
        const run = await this.payrollRunsModel.findById(runId);
        if (!run) {
            throw new NotFoundException('Payroll run not found');
        }

        if (run.status !== PayRollStatus.UNDER_REVIEW) {
            throw new BadRequestException('Payroll must be under review for manager approval');
        }

        run.status = PayRollStatus.PENDING_FINANCE_APPROVAL;
        run.payrollManagerId = managerId as any;
        run.managerApprovalDate = new Date();
        return await run.save();
    }

    async financeApprovePayroll(runId: string, financeStaffId: string): Promise<payrollRuns> {
        const run = await this.payrollRunsModel.findById(runId);
        if (!run) {
            throw new NotFoundException('Payroll run not found');
        }

        if (run.status !== PayRollStatus.PENDING_FINANCE_APPROVAL) {
            throw new BadRequestException('Payroll must be pending finance approval');
        }

        run.status = PayRollStatus.APPROVED;
        run.financeStaffId = financeStaffId as any;
        run.financeApprovalDate = new Date();
        return await run.save();
    }

    async rejectPayroll(runId: string, rejectorId: string, rejectionReason: string): Promise<payrollRuns> {
        const run = await this.payrollRunsModel.findById(runId);
        if (!run) {
            throw new NotFoundException('Payroll run not found');
        }

        if (![PayRollStatus.UNDER_REVIEW, PayRollStatus.PENDING_FINANCE_APPROVAL].includes(run.status)) {
            throw new BadRequestException('Can only reject payroll under review or pending finance approval');
        }

        run.status = PayRollStatus.REJECTED;
        run.rejectionReason = rejectionReason;
        return await run.save();
    }

    async lockPayroll(runId: string, managerId: string): Promise<payrollRuns> {
        const run = await this.payrollRunsModel.findById(runId);
        if (!run) {
            throw new NotFoundException('Payroll run not found');
        }

        if (run.status !== PayRollStatus.APPROVED) {
            throw new BadRequestException('Can only lock approved payroll runs');
        }

        run.status = PayRollStatus.LOCKED;
        return await run.save();
    }

    async unlockPayroll(runId: string, managerId: string, unlockReason: string): Promise<payrollRuns> {
        const run = await this.payrollRunsModel.findById(runId);
        if (!run) {
            throw new NotFoundException('Payroll run not found');
        }

        if (run.status !== PayRollStatus.LOCKED) {
            throw new BadRequestException('Can only unlock locked payroll runs');
        }

        run.status = PayRollStatus.UNLOCKED;
        run.unlockReason = unlockReason;
        return await run.save();
    }

    // =====================================================
    // PHASE 5: Generate Payslips
    // =====================================================

    async generatePayslips(runId: string): Promise<paySlip[]> {
        const run = await this.payrollRunsModel.findById(runId);
        if (!run) {
            throw new NotFoundException('Payroll run not found');
        }

        if (run.status !== PayRollStatus.LOCKED) {
            throw new BadRequestException('Can only generate payslips for locked payroll runs');
        }

        const payslips: paySlip[] = [];

        // Get all employee payroll details for this run
        const payrollDetailsList = await this.employeePayrollDetailsModel.find({
            payrollRunId: run._id
        }).populate('employeeId');

        for (const payrollDetails of payrollDetailsList) {
            // Calculate earnings
            const baseSalary = payrollDetails.baseSalary || 0;
            const allowances = payrollDetails.allowances || 0;
            const bonus = payrollDetails.bonus || 0;
            const benefit = payrollDetails.benefit || 0;

            // Get bonuses for this employee
            const bonuses = await this.employeeSigningBonusModel.find({
                employeeId: payrollDetails.employeeId,
                status: BonusStatus.APPROVED
            }).populate('signingBonusId');

            // Get penalties for this employee
            const employeePenalty = await this.employeePenaltiesModel.findOne({
                employeeId: payrollDetails.employeeId
            });

            const penalties = employeePenalty?.penalties || [];
            const deductions = payrollDetails.deductions || 0;

            const totalGrossSalary = baseSalary + allowances + bonus;
            const totalDeductions = deductions;
            const netPay = payrollDetails.netPay || 0;

            const newPayslip = new this.paySlipModel({
                employeeId: payrollDetails.employeeId,
                payrollRunId: run._id,
                earningsDetails: {
                    baseSalary,
                    allowances: allowances > 0 ? [{ name: 'Allowances', amount: allowances }] : [],
                    bonuses: bonuses.map(b => {
                        const signingBonus = b.signingBonusId as any;
                        return {
                            name: signingBonus?.positionName || 'Signing Bonus',
                            amount: signingBonus?.amount || 0
                        };
                    }),
                    benefits: benefit > 0 ? [{ name: 'Benefits', amount: benefit }] : [],
                    refunds: []
                },
                deductionsDetails: {
                    taxes: [],
                    insurances: [],
                    penalties: penalties.map(p => ({
                        reason: p.reason,
                        amount: p.amount
                    }))
                },
                totalGrossSalary,
                totaDeductions: totalDeductions,
                netPay,
                paymentStatus: run.paymentStatus
            });

            const savedPayslip = await newPayslip.save();
            payslips.push(savedPayslip);
        }

        return payslips;
    }

    // =====================================================
    // Helper Methods
    // =====================================================

    async getPayslipsByRunId(runId: string): Promise<paySlip[]> {
        return await this.paySlipModel.find({ payrollRunId: runId })
            .populate('employeeId', 'firstName lastName employeeCode')
            .exec();
    }

    async getEmployeePayslips(employeeId: string): Promise<paySlip[]> {
        return await this.paySlipModel.find({ employeeId })
            .populate('payrollRunId', 'runId payrollPeriod')
            .sort({ createdAt: -1 })
            .exec();
    }

    async updatePaymentStatus(runId: string, status: PayRollPaymentStatus): Promise<payrollRuns> {
        const run = await this.payrollRunsModel.findById(runId);
        if (!run) {
            throw new NotFoundException('Payroll run not found');
        }

        run.paymentStatus = status;
        return await run.save();
    }
}

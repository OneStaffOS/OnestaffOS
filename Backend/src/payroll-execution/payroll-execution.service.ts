import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { payrollRuns, payrollRunsDocument } from './models/payrollRuns.schema';
import { paySlip, PayslipDocument } from './models/payslip.schema';
import { employeePayrollDetails, employeePayrollDetailsDocument } from './models/employeePayrollDetails.schema';
import { employeeSigningBonus, employeeSigningBonusDocument } from './models/EmployeeSigningBonus.schema';
import { EmployeeTerminationResignation, EmployeeTerminationResignationDocument } from './models/EmployeeTerminationResignation.schema';
import { employeePenalties, employeePenaltiesDocument } from './models/employeePenalties.schema';
import { PayRollStatus, PayRollPaymentStatus, BonusStatus, BenefitStatus, BankStatus } from './enums/payroll-execution-enum';
import { ConfigStatus } from '../payroll-configuration/enums/payroll-configuration-enums';
import { CreatePayrollRunDto } from './dto/create-payroll-run.dto';
import { EmployeeProfile, EmployeeProfileDocument } from '../employee-profile/models/employee-profile.schema';
import { payGrade, payGradeDocument } from '../payroll-configuration/models/payGrades.schema';
import { allowance, allowanceDocument } from '../payroll-configuration/models/allowance.schema';
import { taxRules, taxRulesDocument } from '../payroll-configuration/models/taxRules.schema';
import { insuranceBrackets, insuranceBracketsDocument } from '../payroll-configuration/models/insuranceBrackets.schema';
import { AttendanceRecord, AttendanceRecordDocument } from '../time-management/models/attendance-record.schema';
import { LeaveRequest, LeaveRequestDocument } from '../leaves/models/leave-request.schema';
import { LeaveType, LeaveTypeDocument } from '../leaves/models/leave-type.schema';
import { LeaveEntitlement, LeaveEntitlementDocument } from '../leaves/models/leave-entitlement.schema';
import { signingBonus, signingBonusDocument } from '../payroll-configuration/models/signingBonus.schema';
import { Contract, ContractDocument } from '../recruitment/models/contract.schema';
import { Offer, OfferDocument } from '../recruitment/models/offer.schema';

@Injectable()
export class PayrollExecutionService {
    constructor(
        @InjectModel(payrollRuns.name) private payrollRunsModel: Model<payrollRunsDocument>,
        @InjectModel(paySlip.name) private paySlipModel: Model<PayslipDocument>,
        @InjectModel(employeePayrollDetails.name) private employeePayrollDetailsModel: Model<employeePayrollDetailsDocument>,
        @InjectModel(employeeSigningBonus.name) private employeeSigningBonusModel: Model<employeeSigningBonusDocument>,
        @InjectModel(EmployeeTerminationResignation.name) private employeeTerminationModel: Model<EmployeeTerminationResignationDocument>,
        @InjectModel(employeePenalties.name) private employeePenaltiesModel: Model<employeePenaltiesDocument>,
        @InjectModel(EmployeeProfile.name) private employeeProfileModel: Model<EmployeeProfileDocument>,
        @InjectModel(payGrade.name) private payGradeModel: Model<payGradeDocument>,
        @InjectModel(allowance.name) private allowanceModel: Model<allowanceDocument>,
        @InjectModel(taxRules.name) private taxRulesModel: Model<taxRulesDocument>,
        @InjectModel(insuranceBrackets.name) private insuranceBracketsModel: Model<insuranceBracketsDocument>,
        @InjectModel(AttendanceRecord.name) private attendanceRecordModel: Model<AttendanceRecordDocument>,
        @InjectModel(LeaveRequest.name) private leaveRequestModel: Model<LeaveRequestDocument>,
        @InjectModel(LeaveType.name) private leaveTypeModel: Model<LeaveTypeDocument>,
        @InjectModel(LeaveEntitlement.name) private leaveEntitlementModel: Model<LeaveEntitlementDocument>,
        @InjectModel(signingBonus.name) private signingBonusConfigModel: Model<signingBonusDocument>,
        @InjectModel(Contract.name) private contractModel: Model<ContractDocument>,
        @InjectModel(Offer.name) private offerModel: Model<OfferDocument>,
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
    // PHASE 1: Payroll Run Initiation with Automatic Calculation
    // =====================================================

    /**
     * Auto-approve signing bonus execution records where the config is already approved.
     * This ensures bonuses created before the auto-approval fix are included in payroll.
     */
    private async autoApproveSigningBonusExecutionRecords(): Promise<void> {
        try {
            // RETROACTIVE FIX: Create missing execution records for signed contracts
            const contractsWithBonus = await this.contractModel.find({ signingBonus: { $exists: true, $gt: 0 } }).populate('offerId').exec();
            const signedContracts = contractsWithBonus.filter(c => c.employeeSignedAt);
            
            for (const contract of signedContracts) {
                const offer = contract.offerId as any;
                if (!offer || !offer.candidateId) {
                    continue;
                }
                
                const candidateId = offer.candidateId;
                
                // Check if execution record already exists
                const existingRecord = await this.employeeSigningBonusModel.findOne({
                    employeeId: candidateId
                }).exec();
                
                if (!existingRecord) {
                    // Find approved signing bonus config for the role
                    const signingBonusConfig = await this.signingBonusConfigModel.findOne({
                        positionName: contract.role,
                        status: ConfigStatus.APPROVED
                    }).exec();
                    
                    if (signingBonusConfig) {
                        const newRecord = new this.employeeSigningBonusModel({
                            employeeId: candidateId,
                            signingBonusId: signingBonusConfig._id,
                            givenAmount: contract.signingBonus,
                            status: BonusStatus.APPROVED
                        });
                        await newRecord.save();
                    }
                }
            }
            
            // Find all PENDING signing bonus execution records
            const pendingBonuses = await this.employeeSigningBonusModel
                .find({ status: BonusStatus.PENDING })
                .populate('signingBonusId')
                .exec();

            for (const bonus of pendingBonuses) {
                // Check if the config is approved
                if (bonus.signingBonusId && (bonus.signingBonusId as any).status === ConfigStatus.APPROVED) {
                    bonus.status = BonusStatus.APPROVED;
                    await bonus.save();
                }
            }
        } catch (error) {
            console.error('Error auto-approving signing bonus execution records:', error);
            // Don't throw - this is not critical
        }
    }

    async createPayrollRun(dto: CreatePayrollRunDto, createdById: string): Promise<payrollRuns> {
        // Auto-approve signing bonus execution records where config is already approved
        await this.autoApproveSigningBonusExecutionRecords();

        // Generate unique runId
        const runCount = await this.payrollRunsModel.countDocuments();
        const runId = `PR-${new Date().getFullYear()}-${String(runCount + 1).padStart(4, '0')}`;

        // Get all active employees with ACTIVE status
        const activeEmployees = await this.employeeProfileModel.find({ status: 'ACTIVE' })
            .select('+bankAccountNumber +bankName')
            .populate('payGradeId')
            .exec();

        if (activeEmployees.length === 0) {
            throw new BadRequestException('No active employees found for payroll processing');
        }

        // Get approved configuration data
        const approvedAllowances = await this.allowanceModel.find({ status: 'approved' }).exec();
        const approvedTaxRules = await this.taxRulesModel.find({ status: 'approved' }).exec();
        const approvedInsuranceBrackets = await this.insuranceBracketsModel.find({ status: 'approved' }).exec();

        let totalNetPay = 0;
        let exceptionCount = 0;
        const employeePayrollData: any[] = [];

        // Calculate payroll for each employee
        for (const employee of activeEmployees) {
            try {
                const payrollDetail = await this.calculateEmployeePayroll(
                    employee,
                    approvedAllowances,
                    approvedTaxRules,
                    approvedInsuranceBrackets,
                    dto.payrollPeriod
                );

                employeePayrollData.push(payrollDetail);
                totalNetPay += payrollDetail.netPay;
                if (payrollDetail.exceptions) {
                    exceptionCount++;
                }
            } catch (error) {
                console.error(`Error calculating payroll for employee ${employee._id}:`, error);
                exceptionCount++;
            }
        }

        // Create the payroll run
        const newRun = new this.payrollRunsModel({
            runId,
            payrollPeriod: dto.payrollPeriod,
            entity: dto.entity,
            employees: activeEmployees.length,
            exceptions: exceptionCount,
            totalnetpay: totalNetPay,
            status: PayRollStatus.DRAFT,
            paymentStatus: PayRollPaymentStatus.PENDING,
            payrollSpecialistId: new Types.ObjectId(createdById),
        });

        const savedRun = await newRun.save();

        // Save employee payroll details
        for (const payrollData of employeePayrollData) {
            const employeePayroll = new this.employeePayrollDetailsModel({
                ...payrollData,
                payrollRunId: savedRun._id,
            });
            await employeePayroll.save();
        }

        return savedRun;
    }

    // Helper method to calculate individual employee payroll
    private async calculateEmployeePayroll(
        employee: any,
        approvedAllowances: any[],
        approvedTaxRules: any[],
        approvedInsuranceBrackets: any[],
        payrollPeriod: Date
    ): Promise<any> {
        let exceptions = '';
        let baseSalary = 0;
        let totalAllowances = 0;
        let totalDeductions = 0;
        let bonusAmount = 0;
        let benefitAmount = 0;

        // Check for bank account
        const bankStatus: BankStatus = (employee.bankAccountNumber && employee.bankName) 
            ? BankStatus.VALID 
            : BankStatus.MISSING;

        if (bankStatus === BankStatus.MISSING) {
            exceptions += 'Missing bank account details; ';
        }

        // Get base salary from pay grade
        if (employee.payGradeId && employee.payGradeId.baseSalary) {
            baseSalary = employee.payGradeId.baseSalary;
        } else {
            exceptions += 'Missing pay grade assignment; ';
            baseSalary = 0;
        }

        // Calculate prorated salary for mid-month hires
        const hireDate = new Date(employee.dateOfHire);
        const payrollPeriodDate = new Date(payrollPeriod);
        const periodStart = new Date(payrollPeriodDate.getFullYear(), payrollPeriodDate.getMonth(), 1);
        const periodEnd = new Date(payrollPeriodDate.getFullYear(), payrollPeriodDate.getMonth() + 1, 0, 23, 59, 59, 999);
        
        if (hireDate > periodStart) {
            // Employee was hired mid-month - prorate salary
            const daysInMonth = new Date(payrollPeriodDate.getFullYear(), payrollPeriodDate.getMonth() + 1, 0).getDate();
            const workedDays = Math.max(0, Math.ceil((periodEnd.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
            baseSalary = (baseSalary / daysInMonth) * workedDays;
            exceptions += `Prorated salary (${workedDays}/${daysInMonth} days); `;
        }

        // Calculate allowances
        for (const allowance of approvedAllowances) {
            totalAllowances += allowance.amount || 0;
        }

        // Check for approved signing bonuses
        const approvedBonuses = await this.employeeSigningBonusModel.find({
            employeeId: employee._id,
            status: BonusStatus.APPROVED,
            paymentDate: { $exists: false } // Not yet paid
        }).populate('signingBonusId');

        for (const bonus of approvedBonuses) {
            bonusAmount += bonus.givenAmount || 0;
        }

        // Check for approved termination benefits
        const approvedBenefits = await this.employeeTerminationModel.find({
            employeeId: employee._id,
            status: BenefitStatus.APPROVED,
        });

        for (const benefit of approvedBenefits) {
            benefitAmount += benefit.givenAmount || 0;
        }

        // Calculate gross salary
        const grossSalary = baseSalary + totalAllowances + bonusAmount + benefitAmount;
        const annualGrossSalary = grossSalary * 12; // Convert to annual for tax calculation

        // Determine applicable tax bracket based on annual salary
        // Tax brackets (complete Egyptian tax system):
        // Bracket 1: 0 - 15,000 = 0%
        // Bracket 2: 15,001 - 30,000 = 2.5%
        // Bracket 3: 30,001 - 45,000 = 10%
        // Bracket 4: 45,001 - 60,000 = 15%
        // Bracket 5: 60,001 - 200,000 = 20%
        // Bracket 6: 200,001 - 400,000 = 22.47%
        // Bracket 7: 400,000+ = 25%
        // Solidarity: 1,000,000+ = 1% (additional)
        
        let applicableTaxRule: any = null;
        
        for (const taxRule of approvedTaxRules) {
            if (taxRule.name?.toLowerCase().includes('solidarity')) {
                // Handle solidarity tax separately
                continue;
            }
            
            // Match tax bracket based on annual salary
            if (taxRule.name?.toLowerCase().includes('bracket 1') && annualGrossSalary <= 15000) {
                applicableTaxRule = taxRule;
                break;
            } else if (taxRule.name?.toLowerCase().includes('bracket 2') && annualGrossSalary >= 15001 && annualGrossSalary <= 30000) {
                applicableTaxRule = taxRule;
                break;
            } else if (taxRule.name?.toLowerCase().includes('bracket 3') && annualGrossSalary >= 30001 && annualGrossSalary <= 45000) {
                applicableTaxRule = taxRule;
                break;
            } else if (taxRule.name?.toLowerCase().includes('bracket 4') && annualGrossSalary >= 45001 && annualGrossSalary <= 60000) {
                applicableTaxRule = taxRule;
                break;
            } else if (taxRule.name?.toLowerCase().includes('bracket 5') && annualGrossSalary >= 60001 && annualGrossSalary <= 200000) {
                applicableTaxRule = taxRule;
                break;
            } else if (taxRule.name?.toLowerCase().includes('bracket 6') && annualGrossSalary >= 200001 && annualGrossSalary <= 400000) {
                applicableTaxRule = taxRule;
                break;
            } else if (taxRule.name?.toLowerCase().includes('bracket 7') && annualGrossSalary > 400000) {
                applicableTaxRule = taxRule;
                break;
            }
        }
        
        // Apply the matched tax bracket
        if (applicableTaxRule) {
            const taxAmount = (grossSalary * (applicableTaxRule.rate || 0)) / 100;
            totalDeductions += taxAmount;
        }
        
        // Apply solidarity tax if applicable (1% for income above 1M annually)
        const solidarityTax = approvedTaxRules.find(t => t.name?.toLowerCase().includes('solidarity'));
        if (solidarityTax && annualGrossSalary > 1000000) {
            const taxAmount = (grossSalary * (solidarityTax.rate || 0)) / 100;
            totalDeductions += taxAmount;
        }

        // Calculate insurance deductions - find matching bracket
        for (const insurance of approvedInsuranceBrackets) {
            if (grossSalary >= insurance.minSalary && grossSalary <= insurance.maxSalary) {
                const employeeInsurance = (grossSalary * (insurance.employeeRate || 0)) / 100;
                totalDeductions += employeeInsurance;
                break; // Only apply one insurance bracket
            }
        }

        // Get penalties if any
        const employeePenalty = await this.employeePenaltiesModel.findOne({
            employeeId: employee._id
        });

        if (employeePenalty && employeePenalty.penalties) {
            for (const penalty of employeePenalty.penalties) {
                totalDeductions += penalty.amount || 0;
            }
        }

        // =====================================================
        // ATTENDANCE-BASED DEDUCTIONS
        // =====================================================
        
        // Get attendance records for the payroll period (reuse periodStart and periodEnd from above)
        const attendanceRecords = await this.attendanceRecordModel.find({
            employeeId: employee._id,
            $or: [
                { 'punches.0.time': { $gte: periodStart, $lte: periodEnd } },
                { 'punches.time': { $gte: periodStart, $lte: periodEnd } }
            ]
        }).exec();

        // Calculate expected working days in the period
        const daysInMonth = new Date(periodEnd.getFullYear(), periodEnd.getMonth() + 1, 0).getDate();
        const expectedWorkingDays = Math.floor(daysInMonth * (22 / 30)); // Assuming 22 working days per month
        
        // Count actual working days from attendance
        const actualWorkingDays = attendanceRecords.filter(record => 
            record.totalWorkMinutes > 0 && !record.hasMissedPunch
        ).length;
        
        // Calculate absent days (days without attendance)
        const absentDays = Math.max(0, expectedWorkingDays - actualWorkingDays);
        
        if (absentDays > 0) {
            // Deduct salary for absent days
            const dailyRate = baseSalary / expectedWorkingDays;
            const absentDeduction = dailyRate * absentDays;
            totalDeductions += absentDeduction;
            exceptions += `${absentDays} absent days detected (${absentDeduction.toFixed(2)} deducted); `;
        }

        // =====================================================
        // LEAVE-BASED DEDUCTIONS
        // =====================================================
        
        // Get approved leave requests for the payroll period
        const approvedLeaves = await this.leaveRequestModel.find({
            employeeId: employee._id,
            status: 'approved', // Lowercase to match LeaveStatus enum
            'dates.from': { $lte: periodEnd },
            'dates.to': { $gte: periodStart }
        }).populate('leaveTypeId').exec();

        let unpaidLeaveDays = 0;
        let paidLeaveExceededDays = 0;
        
        for (const leave of approvedLeaves) {
            const leaveType = leave.leaveTypeId as any;
            
            // Calculate overlapping days with payroll period
            const leaveStart = new Date(leave.dates.from) < periodStart ? periodStart : new Date(leave.dates.from);
            const leaveEnd = new Date(leave.dates.to) > periodEnd ? periodEnd : new Date(leave.dates.to);
            const daysInPeriod = Math.ceil((leaveEnd.getTime() - leaveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            const leaveDaysToProcess = Math.min(daysInPeriod, leave.durationDays);
            
            if (!leaveType) continue;
            
            if (leaveType.paid === false) {
                // Explicitly unpaid leave
                unpaidLeaveDays += leaveDaysToProcess;
                
            } else if (leaveType.paid === true && leaveType.deductible) {
                // Paid leave - check if balance was exceeded
                // Get the employee's leave entitlement
                const entitlement = await this.leaveEntitlementModel.findOne({
                    employeeId: employee._id,
                    leaveTypeId: leaveType._id
                }).exec();
                
                if (entitlement) {
                    // Check if the leave exceeded the balance at the time
                    // Total available = yearlyEntitlement + carryForward
                    // If taken + pending > available, they exceeded
                    const totalAvailable = entitlement.yearlyEntitlement + entitlement.carryForward;
                    const totalUsed = entitlement.taken + entitlement.pending;
                    const exceeded = totalUsed - totalAvailable;
                    
                    if (exceeded > 0) {
                        // They exceeded their balance - treat exceeded days as unpaid
                        const exceededDaysInThisPeriod = Math.min(leaveDaysToProcess, exceeded);
                        paidLeaveExceededDays += exceededDaysInThisPeriod;
                    }
                }
            }
        }
        
        const totalUnpaidDays = unpaidLeaveDays + paidLeaveExceededDays;
        
        if (totalUnpaidDays > 0) {
            // Deduct salary for unpaid leave days
            const dailyRate = baseSalary / expectedWorkingDays;
            const unpaidLeaveDeduction = dailyRate * totalUnpaidDays;
            totalDeductions += unpaidLeaveDeduction;
            
            let leaveDeductionMessage = '';
            if (unpaidLeaveDays > 0) {
                leaveDeductionMessage += `${unpaidLeaveDays} unpaid leave days`;
            }
            if (paidLeaveExceededDays > 0) {
                if (leaveDeductionMessage) leaveDeductionMessage += ' + ';
                leaveDeductionMessage += `${paidLeaveExceededDays} paid leave days over balance`;
            }
            leaveDeductionMessage += ` (${unpaidLeaveDeduction.toFixed(2)} deducted)`;
            
            exceptions += `${leaveDeductionMessage}; `;
        }

        // Calculate net pay
        const netSalary = grossSalary - totalDeductions;
        const netPay = Math.max(0, netSalary); // Ensure non-negative

        // Flag negative net pay
        if (netSalary < 0) {
            exceptions += 'Negative net pay detected; ';
        }

        // Flag sudden salary spikes (more than 50% increase from base)
        if (employee.payGradeId && employee.payGradeId.baseSalary) {
            const expectedSalary = employee.payGradeId.baseSalary;
            if (grossSalary > expectedSalary * 1.5) {
                exceptions += 'Sudden salary spike detected; ';
            }
        }

        return {
            employeeId: employee._id,
            baseSalary,
            allowances: totalAllowances,
            deductions: totalDeductions,
            netSalary,
            netPay,
            bankStatus,
            exceptions: exceptions || undefined,
            bonus: bonusAmount > 0 ? bonusAmount : undefined,
            benefit: benefitAmount > 0 ? benefitAmount : undefined,
        };
    }

    async getAllPayrollRuns(status?: PayRollStatus): Promise<payrollRuns[]> {
        const filter = status ? { status } : {};
        return await this.payrollRunsModel.find(filter)
            .populate({ path: 'payrollSpecialistId', select: 'firstName lastName', model: 'EmployeeProfile' })
            .populate({ path: 'payrollManagerId', select: 'firstName lastName', model: 'EmployeeProfile' })
            .populate({ path: 'financeStaffId', select: 'firstName lastName', model: 'EmployeeProfile' })
            .sort({ createdAt: -1 })
            .exec();
    }

    async getPayrollRunById(runId: string): Promise<payrollRuns> {
        const run = await this.payrollRunsModel.findById(runId)
            .populate({ path: 'payrollSpecialistId', select: 'firstName lastName', model: 'EmployeeProfile' })
            .populate({ path: 'payrollManagerId', select: 'firstName lastName', model: 'EmployeeProfile' })
            .populate({ path: 'financeStaffId', select: 'firstName lastName', model: 'EmployeeProfile' })
            .exec();
        
        if (!run) {
            throw new NotFoundException('Payroll run not found');
        }
        return run;
    }

    async getEmployeePayrollDetailsByRunId(runId: string): Promise<employeePayrollDetails[]> {
        return await this.employeePayrollDetailsModel.find({ payrollRunId: runId })
            .populate('employeeId', 'firstName lastName employeeNumber bankName bankAccountNumber')
            .sort({ netPay: -1 })
            .exec();
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

        if (run.status !== PayRollStatus.UNDER_REVIEW) {
            throw new BadRequestException('Can only publish payroll runs that are under review');
        }

        run.status = PayRollStatus.PENDING_FINANCE_APPROVAL;
        return await run.save();
    }

    async submitForReview(runId: string): Promise<payrollRuns> {
        const run = await this.payrollRunsModel.findById(runId);
        if (!run) {
            throw new NotFoundException('Payroll run not found');
        }

        if (run.status !== PayRollStatus.DRAFT) {
            throw new BadRequestException('Can only submit draft payroll runs');
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
        run.paymentStatus = PayRollPaymentStatus.PAID;
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

        if (run.paymentStatus !== PayRollPaymentStatus.PAID) {
            throw new BadRequestException('Can only generate payslips when payment status is PAID');
        }

        // Check if payslips already exist for this run
        const existingPayslips = await this.paySlipModel.find({ payrollRunId: run._id });
        if (existingPayslips.length > 0) {
            throw new BadRequestException(`Payslips already generated for this run. Found ${existingPayslips.length} existing payslips.`);
        }

        const payslips: paySlip[] = [];

        // Get all employee payroll details for this run
        const payrollDetailsList = await this.employeePayrollDetailsModel.find({
            payrollRunId: run._id
        }).populate('employeeId');

        for (const payrollDetails of payrollDetailsList) {
            try {
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

                // Re-calculate tax and insurance details for payslip
                const grossSalary = baseSalary + allowances + bonus + benefit;
                const annualGrossSalary = grossSalary * 12;
                const appliedTaxRules: any[] = [];
                const appliedInsuranceBrackets: any[] = [];
                
                // Get approved configuration
                const approvedTaxRules = await this.taxRulesModel.find({ status: 'approved' }).exec();
                const approvedInsuranceBrackets = await this.insuranceBracketsModel.find({ status: 'approved' }).exec();
                
                // Match tax bracket based on annual salary
                for (const taxRule of approvedTaxRules) {
                    if (taxRule.name?.toLowerCase().includes('solidarity')) {
                        // Solidarity tax applies to very high earners (above 1M annually)
                        if (annualGrossSalary > 1000000) {
                            appliedTaxRules.push(taxRule);
                        }
                        continue;
                    }
                    
                    // Match the appropriate income tax bracket (1-7)
                    if (taxRule.name?.toLowerCase().includes('bracket 1') && annualGrossSalary <= 15000) {
                        appliedTaxRules.push(taxRule);
                        break;
                    } else if (taxRule.name?.toLowerCase().includes('bracket 2') && annualGrossSalary >= 15001 && annualGrossSalary <= 30000) {
                        appliedTaxRules.push(taxRule);
                        break;
                    } else if (taxRule.name?.toLowerCase().includes('bracket 3') && annualGrossSalary >= 30001 && annualGrossSalary <= 45000) {
                        appliedTaxRules.push(taxRule);
                        break;
                    } else if (taxRule.name?.toLowerCase().includes('bracket 4') && annualGrossSalary >= 45001 && annualGrossSalary <= 60000) {
                        appliedTaxRules.push(taxRule);
                        break;
                    } else if (taxRule.name?.toLowerCase().includes('bracket 5') && annualGrossSalary >= 60001 && annualGrossSalary <= 200000) {
                        appliedTaxRules.push(taxRule);
                        break;
                    } else if (taxRule.name?.toLowerCase().includes('bracket 6') && annualGrossSalary >= 200001 && annualGrossSalary <= 400000) {
                        appliedTaxRules.push(taxRule);
                        break;
                    } else if (taxRule.name?.toLowerCase().includes('bracket 7') && annualGrossSalary > 400000) {
                        appliedTaxRules.push(taxRule);
                        break;
                    }
                }
                
                // Calculate insurance details - match based on monthly gross salary
                for (const insurance of approvedInsuranceBrackets) {
                    if (grossSalary >= insurance.minSalary && grossSalary <= insurance.maxSalary) {
                        appliedInsuranceBrackets.push(insurance);
                    }
                }

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
                        taxes: appliedTaxRules,
                        insurances: appliedInsuranceBrackets,
                        penalties: employeePenalty || undefined
                    },
                    totalGrossSalary,
                    totaDeductions: totalDeductions,
                    netPay,
                    paymentStatus: run.paymentStatus
                });

                const savedPayslip = await newPayslip.save();
                payslips.push(savedPayslip);
            } catch (error) {
                console.error(`Failed to generate payslip for employee ${payrollDetails.employeeId}:`, error.message);
                // Continue with next employee instead of failing entire batch
                continue;
            }
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

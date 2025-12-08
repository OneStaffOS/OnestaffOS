import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { disputes, disputesDocument } from './models/disputes.schema';
import { claims, claimsDocument } from './models/claims.schema';
import { refunds, refundsDocument } from './models/refunds.schema';
import { paySlip, PayslipDocument } from '../payroll-execution/models/payslip.schema';
import { Department } from '../organization-structure/models/department.schema';
import { EmployeeProfile } from '../employee-profile/models/employee-profile.schema';
import { DisputeStatus, ClaimStatus, RefundStatus } from './enums/payroll-tracking-enum';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { CreateClaimDto } from './dto/create-claim.dto';
import { GenerateDepartmentReportDto, DepartmentReportResponse } from './dto/department-report.dto';
import { NotificationService } from '../notifications/notification.service';

@Injectable()
export class PayrollTrackingService {
    constructor(
        @InjectModel(disputes.name) private disputesModel: Model<disputesDocument>,
        @InjectModel(claims.name) private claimsModel: Model<claimsDocument>,
        @InjectModel(refunds.name) private refundsModel: Model<refundsDocument>,
        @InjectModel(paySlip.name) private paySlipModel: Model<PayslipDocument>,
        @InjectModel(Department.name) private departmentModel: Model<Department>,
        @InjectModel(EmployeeProfile.name) private employeeModel: Model<EmployeeProfile>,
        private notificationService: NotificationService,
    ) {}

    // =====================================================
    // PHASE 1: Employee Self-Service - Disputes
    // =====================================================

    async createDispute(dto: CreateDisputeDto, employeeId: string): Promise<disputes> {
        // Generate unique disputeId
        const disputeCount = await this.disputesModel.countDocuments();
        const disputeId = `DISP-${String(disputeCount + 1).padStart(4, '0')}`;

        const newDispute = new this.disputesModel({
            disputeId,
            description: dto.description,
            employeeId: new Types.ObjectId(employeeId),
            payslipId: new Types.ObjectId(dto.payslipId),
            status: DisputeStatus.UNDER_REVIEW,
        });

        return await newDispute.save();
    }

    async getEmployeeDisputes(employeeId: string): Promise<disputes[]> {
        const disputes = await this.disputesModel.find({ employeeId: new Types.ObjectId(employeeId) })
            .populate('payslipId')
            .populate('payrollSpecialistId', 'firstName lastName')
            .populate('payrollManagerId', 'firstName lastName')
            .sort({ createdAt: -1 })
            .exec();
        
        return disputes;
    }

    async getDisputeById(disputeId: string): Promise<disputes> {
        const dispute = await this.disputesModel.findById(disputeId)
            .populate('employeeId', 'firstName lastName employeeCode')
            .populate('payslipId')
            .populate('financeStaffId', 'firstName lastName')
            .exec();

        if (!dispute) {
            throw new NotFoundException('Dispute not found');
        }
        return dispute;
    }

    async getAllDisputes(status?: DisputeStatus): Promise<disputes[]> {
        const filter = status ? { status } : {};
        return await this.disputesModel.find(filter)
            .populate('employeeId', 'firstName lastName employeeCode')
            .populate('payslipId')
            .populate('payrollSpecialistId', 'firstName lastName')
            .populate('payrollManagerId', 'firstName lastName')
            .sort({ createdAt: -1 })
            .exec();
    }

    // =====================================================
    // PHASE 3: Dispute Approval Workflow (Specialist -> Manager)
    // =====================================================

    async approveDisputeBySpecialist(disputeId: string, payrollSpecialistId: string, resolutionComment?: string): Promise<disputes> {
        const dispute = await this.disputesModel.findById(disputeId);
        if (!dispute) {
            throw new NotFoundException('Dispute not found');
        }

        if (dispute.status !== DisputeStatus.UNDER_REVIEW) {
            throw new BadRequestException('Can only approve disputes under review');
        }

        // Specialist approval escalates to manager
        dispute.status = DisputeStatus.PENDING_MANAGER_APPROVAL;
        dispute.payrollSpecialistId = new Types.ObjectId(payrollSpecialistId);
        dispute.resolutionComment = resolutionComment;
        return await dispute.save();
    }

    async rejectDispute(disputeId: string, payrollSpecialistId: string, rejectionReason: string): Promise<disputes> {
        const dispute = await this.disputesModel.findById(disputeId);
        if (!dispute) {
            throw new NotFoundException('Dispute not found');
        }

        if (dispute.status !== DisputeStatus.UNDER_REVIEW) {
            throw new BadRequestException('Can only reject disputes under review');
        }

        dispute.status = DisputeStatus.REJECTED;
        dispute.payrollSpecialistId = new Types.ObjectId(payrollSpecialistId);
        dispute.rejectionReason = rejectionReason;
        return await dispute.save();
    }

    // =====================================================
    // Manager Dispute Approval (Final Step)
    // =====================================================

    async getDisputesPendingManagerApproval(): Promise<disputes[]> {
        return await this.disputesModel.find({ status: DisputeStatus.PENDING_MANAGER_APPROVAL })
            .populate('employeeId', 'firstName lastName employeeCode')
            .populate('payslipId')
            .populate('payrollSpecialistId', 'firstName lastName')
            .sort({ createdAt: -1 })
            .exec();
    }

    async managerApproveDispute(disputeId: string, payrollManagerId: string, resolutionComment?: string): Promise<disputes> {
        const dispute = await this.disputesModel.findById(disputeId);
        if (!dispute) {
            throw new NotFoundException('Dispute not found');
        }

        if (dispute.status !== DisputeStatus.PENDING_MANAGER_APPROVAL) {
            throw new BadRequestException('Can only approve disputes pending manager approval');
        }

        dispute.status = DisputeStatus.APPROVED;
        dispute.payrollManagerId = new Types.ObjectId(payrollManagerId);
        
        // Assign to finance staff (using financeStaffId field that already exists in schema)
        // Find a finance staff member to assign to
        const financeStaff = await this.employeeModel.findOne({ 
            roles: 'Finance Staff' 
        }).exec();
        
        if (financeStaff) {
            dispute.financeStaffId = financeStaff._id;
        }
        
        if (resolutionComment) {
            dispute.resolutionComment = dispute.resolutionComment 
                ? `${dispute.resolutionComment}\n\nManager: ${resolutionComment}`
                : resolutionComment;
        }
        
        const savedDispute = await dispute.save();

        // Send notification to all finance staff
        try {
            await this.notificationService.createNotification(payrollManagerId, {
                title: '💰 New Approved Dispute for Adjustment',
                message: `Dispute ${dispute.disputeId} has been approved by Payroll Manager. Employee: ${await this.getEmployeeName(dispute.employeeId)}. Please process the necessary adjustments.`,
                targetRole: 'Finance Staff',
            });
        } catch (error) {
            console.error('Failed to send notification to finance staff:', error);
        }

        return savedDispute;
    }

    private async getEmployeeName(employeeId: Types.ObjectId): Promise<string> {
        const employee = await this.employeeModel.findById(employeeId).select('firstName lastName employeeNumber').exec();
        return employee ? `${employee.firstName} ${employee.lastName} (${employee.employeeNumber})` : 'Unknown';
    }

    async managerRejectDispute(disputeId: string, payrollManagerId: string, rejectionReason: string): Promise<disputes> {
        const dispute = await this.disputesModel.findById(disputeId);
        if (!dispute) {
            throw new NotFoundException('Dispute not found');
        }

        if (dispute.status !== DisputeStatus.PENDING_MANAGER_APPROVAL) {
            throw new BadRequestException('Can only reject disputes pending manager approval');
        }

        dispute.status = DisputeStatus.REJECTED;
        dispute.payrollManagerId = new Types.ObjectId(payrollManagerId);
        dispute.rejectionReason = rejectionReason;
        return await dispute.save();
    }

    // =====================================================
    // PHASE 1: Employee Self-Service - Claims
    // =====================================================

    async createClaim(dto: CreateClaimDto, employeeId: string): Promise<claims> {
        // Generate unique claimId
        const claimCount = await this.claimsModel.countDocuments();
        const claimId = `CLAIM-${String(claimCount + 1).padStart(4, '0')}`;

        const newClaim = new this.claimsModel({
            claimId,
            description: dto.description,
            claimType: dto.claimType,
            employeeId: new Types.ObjectId(employeeId),
            amount: dto.amount,
            status: ClaimStatus.UNDER_REVIEW,
        });

        return await newClaim.save();
    }

    async getEmployeeClaims(employeeId: string): Promise<claims[]> {
        return await this.claimsModel.find({ employeeId: new Types.ObjectId(employeeId) })
            .populate('payrollSpecialistId', 'firstName lastName')
            .populate('payrollManagerId', 'firstName lastName')
            .populate('financeStaffId', 'firstName lastName')
            .sort({ createdAt: -1 })
            .exec();
    }

    async getClaimById(claimId: string): Promise<claims> {
        const claim = await this.claimsModel.findById(claimId)
            .populate('employeeId', 'firstName lastName employeeNumber')
            .populate('payrollSpecialistId', 'firstName lastName')
            .populate('payrollManagerId', 'firstName lastName')
            .populate('financeStaffId', 'firstName lastName')
            .exec();

        if (!claim) {
            throw new NotFoundException('Claim not found');
        }
        return claim;
    }

    async getAllClaims(status?: ClaimStatus): Promise<claims[]> {
        const filter = status ? { status } : {};
        return await this.claimsModel.find(filter)
            .populate('employeeId', 'firstName lastName employeeNumber')
            .populate('payrollSpecialistId', 'firstName lastName')
            .populate('payrollManagerId', 'firstName lastName')
            .populate('financeStaffId', 'firstName lastName')
            .sort({ createdAt: -1 })
            .exec();
    }

    // =====================================================
    // PHASE 3: Claim Approval Workflow (Specialist -> Manager)
    // =====================================================

    async approveClaimBySpecialist(claimId: string, payrollSpecialistId: string, approvedAmount: number, resolutionComment?: string): Promise<claims> {
        const claim = await this.claimsModel.findById(claimId);
        if (!claim) {
            throw new NotFoundException('Claim not found');
        }

        if (claim.status !== ClaimStatus.UNDER_REVIEW) {
            throw new BadRequestException('Can only approve claims under review');
        }

        if (approvedAmount > claim.amount) {
            throw new BadRequestException('Approved amount cannot exceed claimed amount');
        }

        // Specialist approval escalates to manager
        claim.status = ClaimStatus.PENDING_MANAGER_APPROVAL;
        claim.payrollSpecialistId = new Types.ObjectId(payrollSpecialistId);
        claim.approvedAmount = approvedAmount;
        claim.resolutionComment = resolutionComment;
        
        return await claim.save();
    }

    async rejectClaimBySpecialist(claimId: string, payrollSpecialistId: string, rejectionReason: string): Promise<claims> {
        const claim = await this.claimsModel.findById(claimId);
        if (!claim) {
            throw new NotFoundException('Claim not found');
        }

        if (claim.status !== ClaimStatus.UNDER_REVIEW) {
            throw new BadRequestException('Can only reject claims under review');
        }

        claim.status = ClaimStatus.REJECTED;
        claim.payrollSpecialistId = new Types.ObjectId(payrollSpecialistId);
        claim.rejectionReason = rejectionReason;
        
        return await claim.save();
    }

    // =====================================================
    // Manager Claim Approval (Final Step)
    // =====================================================

    async getClaimsPendingManagerApproval(): Promise<claims[]> {
        return await this.claimsModel.find({ status: ClaimStatus.PENDING_MANAGER_APPROVAL })
            .populate('employeeId', 'firstName lastName employeeNumber')
            .populate('payrollSpecialistId', 'firstName lastName')
            .sort({ createdAt: -1 })
            .exec();
    }

    async managerApproveClaim(claimId: string, payrollManagerId: string, resolutionComment?: string): Promise<claims> {
        const claim = await this.claimsModel.findById(claimId);
        if (!claim) {
            throw new NotFoundException('Claim not found');
        }

        if (claim.status !== ClaimStatus.PENDING_MANAGER_APPROVAL) {
            throw new BadRequestException('Can only approve claims pending manager approval');
        }

        claim.status = ClaimStatus.APPROVED;
        claim.payrollManagerId = new Types.ObjectId(payrollManagerId);
        
        // Assign to finance staff
        const financeStaff = await this.employeeModel.findOne({ 
            roles: 'Finance Staff' 
        }).exec();
        
        if (financeStaff) {
            claim.financeStaffId = financeStaff._id;
        }
        
        if (resolutionComment) {
            claim.resolutionComment = claim.resolutionComment 
                ? `${claim.resolutionComment}\n\nManager: ${resolutionComment}`
                : resolutionComment;
        }
        
        const savedClaim = await claim.save();

        // Send notification to all finance staff
        try {
            await this.notificationService.createNotification(payrollManagerId, {
                title: '💰 New Approved Expense Claim',
                message: `Expense Claim ${claim.claimId} has been approved by Payroll Manager. Employee: ${await this.getEmployeeName(claim.employeeId)}. Amount: ${claim.approvedAmount}. Please process the payment.`,
                targetRole: 'Finance Staff',
            });
        } catch (error) {
            console.error('Failed to send notification to finance staff:', error);
        }

        return savedClaim;
    }

    async managerRejectClaim(claimId: string, payrollManagerId: string, rejectionReason: string): Promise<claims> {
        const claim = await this.claimsModel.findById(claimId);
        if (!claim) {
            throw new NotFoundException('Claim not found');
        }

        if (claim.status !== ClaimStatus.PENDING_MANAGER_APPROVAL) {
            throw new BadRequestException('Can only reject claims pending manager approval');
        }

        claim.status = ClaimStatus.REJECTED;
        claim.payrollManagerId = new Types.ObjectId(payrollManagerId);
        claim.rejectionReason = rejectionReason;
        
        return await claim.save();
    }

    // =====================================================
    // Legacy Methods (kept for backward compatibility)
    // =====================================================

    async approveClaim(claimId: string, financeStaffId: string, approvedAmount: number, resolutionComment?: string): Promise<claims> {
        const claim = await this.claimsModel.findById(claimId);
        if (!claim) {
            throw new NotFoundException('Claim not found');
        }

        if (claim.status !== ClaimStatus.UNDER_REVIEW) {
            throw new BadRequestException('Can only approve claims under review');
        }

        if (approvedAmount > claim.amount) {
            throw new BadRequestException('Approved amount cannot exceed claimed amount');
        }

        claim.status = ClaimStatus.APPROVED;
        claim.financeStaffId = new Types.ObjectId(financeStaffId);
        claim.approvedAmount = approvedAmount;
        claim.resolutionComment = resolutionComment;
        return await claim.save();
    }

    async rejectClaim(claimId: string, financeStaffId: string, rejectionReason: string): Promise<claims> {
        const claim = await this.claimsModel.findById(claimId);
        if (!claim) {
            throw new NotFoundException('Claim not found');
        }

        if (claim.status !== ClaimStatus.UNDER_REVIEW) {
            throw new BadRequestException('Can only reject claims under review');
        }

        claim.status = ClaimStatus.REJECTED;
        claim.financeStaffId = new Types.ObjectId(financeStaffId);
        claim.rejectionReason = rejectionReason;
        return await claim.save();
    }

    // =====================================================
    // PHASE 4: Refund Generation and Management
    // =====================================================

    async generateDisputeRefund(disputeId: string, financeStaffId: string): Promise<refunds> {
        const dispute = await this.disputesModel.findById(disputeId).populate('employeeId');
        if (!dispute) {
            throw new NotFoundException('Dispute not found');
        }

        if (dispute.status !== DisputeStatus.APPROVED) {
            throw new BadRequestException('Can only generate refunds for approved disputes');
        }

        // Check if refund already exists
        const existingRefund = await this.refundsModel.findOne({ disputeId });
        if (existingRefund) {
            throw new BadRequestException('Refund already generated for this dispute');
        }

        const newRefund = new this.refundsModel({
            disputeId: new Types.ObjectId(disputeId),
            employeeId: dispute.employeeId,
            financeStaffId: new Types.ObjectId(financeStaffId),
            refundDetails: {
                description: `Refund for dispute ${dispute.disputeId}`,
                amount: 0 // Amount should be calculated based on dispute resolution
            },
            status: RefundStatus.PENDING,
        });

        return await newRefund.save();
    }

    async generateClaimRefund(claimId: string, financeStaffId: string): Promise<refunds> {
        const claim = await this.claimsModel.findById(claimId).populate('employeeId');
        if (!claim) {
            throw new NotFoundException('Claim not found');
        }

        if (claim.status !== ClaimStatus.APPROVED) {
            throw new BadRequestException('Can only generate refunds for approved claims');
        }

        // Check if refund already exists
        const existingRefund = await this.refundsModel.findOne({ claimId });
        if (existingRefund) {
            throw new BadRequestException('Refund already generated for this claim');
        }

        const newRefund = new this.refundsModel({
            claimId: new Types.ObjectId(claimId),
            employeeId: claim.employeeId,
            financeStaffId: new Types.ObjectId(financeStaffId),
            refundDetails: {
                description: `Refund for claim ${claim.claimId} - ${claim.claimType}`,
                amount: claim.approvedAmount || claim.amount
            },
            status: RefundStatus.PENDING,
        });

        return await newRefund.save();
    }

    async getPendingRefunds(): Promise<refunds[]> {
        return await this.refundsModel.find({ status: RefundStatus.PENDING })
            .populate('employeeId', 'firstName lastName employeeCode')
            .populate('financeStaffId', 'firstName lastName')
            .populate('disputeId')
            .populate('claimId')
            .sort({ createdAt: -1 })
            .exec();
    }

    async getEmployeeRefunds(employeeId: string): Promise<refunds[]> {
        return await this.refundsModel.find({ employeeId })
            .populate('financeStaffId', 'firstName lastName')
            .populate('disputeId')
            .populate('claimId')
            .populate('paidInPayrollRunId', 'runId payrollPeriod')
            .sort({ createdAt: -1 })
            .exec();
    }

    async markRefundAsPaid(refundId: string, payrollRunId: string): Promise<refunds> {
        const refund = await this.refundsModel.findById(refundId);
        if (!refund) {
            throw new NotFoundException('Refund not found');
        }

        if (refund.status !== RefundStatus.PENDING) {
            throw new BadRequestException('Can only mark pending refunds as paid');
        }

        refund.status = RefundStatus.PAID;
        refund.paidInPayrollRunId = new Types.ObjectId(payrollRunId);
        return await refund.save();
    }

    // =====================================================
    // Helper Methods - Reports and Statistics
    // =====================================================

    async getDisputeStatistics(): Promise<any> {
        const total = await this.disputesModel.countDocuments();
        const underReview = await this.disputesModel.countDocuments({ status: DisputeStatus.UNDER_REVIEW });
        const approved = await this.disputesModel.countDocuments({ status: DisputeStatus.APPROVED });
        const rejected = await this.disputesModel.countDocuments({ status: DisputeStatus.REJECTED });

        return {
            total,
            underReview,
            approved,
            rejected,
            approvalRate: total > 0 ? ((approved / total) * 100).toFixed(2) : 0
        };
    }

    async getClaimStatistics(): Promise<any> {
        const total = await this.claimsModel.countDocuments();
        const underReview = await this.claimsModel.countDocuments({ status: ClaimStatus.UNDER_REVIEW });
        const approved = await this.claimsModel.countDocuments({ status: ClaimStatus.APPROVED });
        const rejected = await this.claimsModel.countDocuments({ status: ClaimStatus.REJECTED });

        const totalClaimedAmount = await this.claimsModel.aggregate([
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const totalApprovedAmount = await this.claimsModel.aggregate([
            { $match: { status: ClaimStatus.APPROVED } },
            { $group: { _id: null, total: { $sum: '$approvedAmount' } } }
        ]);

        return {
            total,
            underReview,
            approved,
            rejected,
            approvalRate: total > 0 ? ((approved / total) * 100).toFixed(2) : 0,
            totalClaimedAmount: totalClaimedAmount[0]?.total || 0,
            totalApprovedAmount: totalApprovedAmount[0]?.total || 0
        };
    }

    async getRefundStatistics(): Promise<any> {
        const total = await this.refundsModel.countDocuments();
        const pending = await this.refundsModel.countDocuments({ status: RefundStatus.PENDING });
        const paid = await this.refundsModel.countDocuments({ status: RefundStatus.PAID });

        const totalRefundAmount = await this.refundsModel.aggregate([
            { $group: { _id: null, total: { $sum: '$refundDetails.amount' } } }
        ]);

        return {
            total,
            pending,
            paid,
            totalRefundAmount: totalRefundAmount[0]?.total || 0
        };
    }

    // =====================================================
    // Finance Reports Generation
    // =====================================================

    async generateFinanceReport(dto: any): Promise<any> {
        const { reportType, startDate, endDate, year, month, entity } = dto;

        switch (reportType) {
            case 'taxes':
                return await this.generateTaxReport(startDate, endDate, entity);
            case 'insurance':
                return await this.generateInsuranceReport(startDate, endDate, entity);
            case 'benefits':
                return await this.generateBenefitsReport(startDate, endDate, entity);
            case 'month-end':
                return await this.generateMonthEndReport(year, month, entity);
            case 'year-end':
                return await this.generateYearEndReport(year, entity);
            default:
                throw new BadRequestException('Invalid report type');
        }
    }

    private async generateTaxReport(startDate: Date, endDate: Date, entity?: string) {
        const query: any = {
            createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
        };

        const payslips = await this.paySlipModel.find(query)
            .populate('employeeId', 'firstName lastName')
            .populate('payrollRunId')
            .exec();

        let filteredPayslips = payslips;
        if (entity) {
            filteredPayslips = payslips.filter(p => {
                const run = p.payrollRunId as any;
                return run && run.entity === entity;
            });
        }

        const taxMap = new Map<string, { count: number; totalAmount: number; rates: number[] }>();

        filteredPayslips.forEach(payslip => {
            payslip.deductionsDetails?.taxes?.forEach(tax => {
                const taxName = tax.name;
                const taxAmount = (payslip.totalGrossSalary * tax.rate) / 100;

                if (!taxMap.has(taxName)) {
                    taxMap.set(taxName, { count: 0, totalAmount: 0, rates: [] });
                }

                const data = taxMap.get(taxName)!;
                data.count++;
                data.totalAmount += taxAmount;
                data.rates.push(tax.rate);
            });
        });

        const taxBreakdown = Array.from(taxMap.entries()).map(([taxName, data]) => ({
            taxName,
            employeeCount: data.count,
            totalAmount: Math.round(data.totalAmount * 100) / 100,
            averageRate: Math.round((data.rates.reduce((a, b) => a + b, 0) / data.rates.length) * 100) / 100
        }));

        const totalTaxCollected = taxBreakdown.reduce((sum, item) => sum + item.totalAmount, 0);

        return {
            reportType: 'taxes',
            period: `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`,
            entity: entity || 'All Entities',
            totalEmployees: new Set(filteredPayslips.map(p => p.employeeId.toString())).size,
            taxBreakdown,
            totalTaxCollected: Math.round(totalTaxCollected * 100) / 100,
            generatedAt: new Date()
        };
    }

    private async generateInsuranceReport(startDate: Date, endDate: Date, entity?: string) {
        const query: any = {
            createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
        };

        const payslips = await this.paySlipModel.find(query)
            .populate('employeeId', 'firstName lastName')
            .populate('payrollRunId')
            .exec();

        let filteredPayslips = payslips;
        if (entity) {
            filteredPayslips = payslips.filter(p => {
                const run = p.payrollRunId as any;
                return run && run.entity === entity;
            });
        }

        const insuranceMap = new Map<string, { 
            count: number; 
            employeeContribution: number; 
            employerContribution: number;
            employeeRates: number[];
            employerRates: number[];
        }>();

        filteredPayslips.forEach(payslip => {
            payslip.deductionsDetails?.insurances?.forEach(insurance => {
                const insuranceName = insurance.name;
                const employeeAmount = (payslip.totalGrossSalary * insurance.employeeRate) / 100;
                const employerAmount = (payslip.totalGrossSalary * insurance.employerRate) / 100;

                if (!insuranceMap.has(insuranceName)) {
                    insuranceMap.set(insuranceName, { 
                        count: 0, 
                        employeeContribution: 0, 
                        employerContribution: 0,
                        employeeRates: [],
                        employerRates: []
                    });
                }

                const data = insuranceMap.get(insuranceName)!;
                data.count++;
                data.employeeContribution += employeeAmount;
                data.employerContribution += employerAmount;
                data.employeeRates.push(insurance.employeeRate);
                data.employerRates.push(insurance.employerRate);
            });
        });

        const insuranceBreakdown = Array.from(insuranceMap.entries()).map(([insuranceName, data]) => ({
            insuranceName,
            employeeCount: data.count,
            employeeContribution: Math.round(data.employeeContribution * 100) / 100,
            employerContribution: Math.round(data.employerContribution * 100) / 100,
            totalContribution: Math.round((data.employeeContribution + data.employerContribution) * 100) / 100,
            averageEmployeeRate: Math.round((data.employeeRates.reduce((a, b) => a + b, 0) / data.employeeRates.length) * 100) / 100,
            averageEmployerRate: Math.round((data.employerRates.reduce((a, b) => a + b, 0) / data.employerRates.length) * 100) / 100
        }));

        const totalEmployeeContribution = insuranceBreakdown.reduce((sum, item) => sum + item.employeeContribution, 0);
        const totalEmployerContribution = insuranceBreakdown.reduce((sum, item) => sum + item.employerContribution, 0);

        return {
            reportType: 'insurance',
            period: `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`,
            entity: entity || 'All Entities',
            totalEmployees: new Set(filteredPayslips.map(p => p.employeeId.toString())).size,
            insuranceBreakdown,
            totalEmployeeContribution: Math.round(totalEmployeeContribution * 100) / 100,
            totalEmployerContribution: Math.round(totalEmployerContribution * 100) / 100,
            totalInsuranceContribution: Math.round((totalEmployeeContribution + totalEmployerContribution) * 100) / 100,
            generatedAt: new Date()
        };
    }

    private async generateBenefitsReport(startDate: Date, endDate: Date, entity?: string) {
        const query: any = {
            createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
        };

        const payslips = await this.paySlipModel.find(query)
            .populate('employeeId', 'firstName lastName')
            .populate('payrollRunId')
            .exec();

        let filteredPayslips = payslips;
        if (entity) {
            filteredPayslips = payslips.filter(p => {
                const run = p.payrollRunId as any;
                return run && run.entity === entity;
            });
        }

        const benefitsMap = new Map<string, { type: string; count: number; totalAmount: number }>();

        filteredPayslips.forEach(payslip => {
            payslip.earningsDetails?.allowances?.forEach(allowance => {
                const key = `allowances:${allowance.name}`;
                if (!benefitsMap.has(key)) {
                    benefitsMap.set(key, { type: 'allowances', count: 0, totalAmount: 0 });
                }
                const data = benefitsMap.get(key)!;
                data.count++;
                data.totalAmount += allowance.amount;
            });

            payslip.earningsDetails?.bonuses?.forEach(bonus => {
                const key = `bonuses:${bonus.positionName}`;
                if (!benefitsMap.has(key)) {
                    benefitsMap.set(key, { type: 'bonuses', count: 0, totalAmount: 0 });
                }
                const data = benefitsMap.get(key)!;
                data.count++;
                data.totalAmount += bonus.amount;
            });

            payslip.earningsDetails?.benefits?.forEach(benefit => {
                const key = `benefits:${benefit.name}`;
                if (!benefitsMap.has(key)) {
                    benefitsMap.set(key, { type: 'benefits', count: 0, totalAmount: 0 });
                }
                const data = benefitsMap.get(key)!;
                data.count++;
                data.totalAmount += benefit.amount;
            });

            payslip.earningsDetails?.refunds?.forEach(refund => {
                const key = `refunds:${refund.description}`;
                if (!benefitsMap.has(key)) {
                    benefitsMap.set(key, { type: 'refunds', count: 0, totalAmount: 0 });
                }
                const data = benefitsMap.get(key)!;
                data.count++;
                data.totalAmount += refund.amount;
            });
        });

        const benefitsBreakdown = Array.from(benefitsMap.entries()).map(([key, data]) => {
            const [type, name] = key.split(':');
            return {
                benefitType: type as 'allowances' | 'bonuses' | 'benefits' | 'refunds',
                benefitName: name,
                employeeCount: data.count,
                totalAmount: Math.round(data.totalAmount * 100) / 100
            };
        });

        const totalBenefitsPaid = benefitsBreakdown.reduce((sum, item) => sum + item.totalAmount, 0);

        return {
            reportType: 'benefits',
            period: `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`,
            entity: entity || 'All Entities',
            totalEmployees: new Set(filteredPayslips.map(p => p.employeeId.toString())).size,
            benefitsBreakdown,
            totalBenefitsPaid: Math.round(totalBenefitsPaid * 100) / 100,
            generatedAt: new Date()
        };
    }

    private async generateMonthEndReport(year: number, month: number, entity?: string) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        const query: any = {
            createdAt: { $gte: startDate, $lte: endDate }
        };

        const payslips = await this.paySlipModel.find(query)
            .populate('employeeId', 'firstName lastName')
            .populate('payrollRunId')
            .exec();

        let filteredPayslips = payslips;
        if (entity) {
            filteredPayslips = payslips.filter(p => {
                const run = p.payrollRunId as any;
                return run && run.entity === entity;
            });
        }

        const totalGrossSalary = filteredPayslips.reduce((sum, p) => sum + p.totalGrossSalary, 0);
        const totalDeductions = filteredPayslips.reduce((sum, p) => sum + (p.totaDeductions || 0), 0);
        const totalNetPay = filteredPayslips.reduce((sum, p) => sum + p.netPay, 0);

        const taxMap = new Map<string, number>();
        filteredPayslips.forEach(payslip => {
            payslip.deductionsDetails?.taxes?.forEach(tax => {
                const amount = (payslip.totalGrossSalary * tax.rate) / 100;
                taxMap.set(tax.name, (taxMap.get(tax.name) || 0) + amount);
            });
        });

        const taxSummary = Array.from(taxMap.entries()).map(([taxName, totalAmount]) => ({
            taxName,
            totalAmount: Math.round(totalAmount * 100) / 100
        }));

        const insuranceMap = new Map<string, { employee: number; employer: number }>();
        filteredPayslips.forEach(payslip => {
            payslip.deductionsDetails?.insurances?.forEach(insurance => {
                const employeeAmount = (payslip.totalGrossSalary * insurance.employeeRate) / 100;
                const employerAmount = (payslip.totalGrossSalary * insurance.employerRate) / 100;
                
                if (!insuranceMap.has(insurance.name)) {
                    insuranceMap.set(insurance.name, { employee: 0, employer: 0 });
                }
                
                const data = insuranceMap.get(insurance.name)!;
                data.employee += employeeAmount;
                data.employer += employerAmount;
            });
        });

        const insuranceSummary = Array.from(insuranceMap.entries()).map(([insuranceName, data]) => ({
            insuranceName,
            employeeContribution: Math.round(data.employee * 100) / 100,
            employerContribution: Math.round(data.employer * 100) / 100
        }));

        let allowancesTotal = 0;
        let bonusesTotal = 0;
        let benefitsTotal = 0;
        let refundsTotal = 0;

        filteredPayslips.forEach(payslip => {
            payslip.earningsDetails?.allowances?.forEach(a => allowancesTotal += a.amount);
            payslip.earningsDetails?.bonuses?.forEach(b => bonusesTotal += b.amount);
            payslip.earningsDetails?.benefits?.forEach(b => benefitsTotal += b.amount);
            payslip.earningsDetails?.refunds?.forEach(r => refundsTotal += r.amount);
        });

        const payrollRunIds = new Set(filteredPayslips.map(p => p.payrollRunId.toString()));

        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];

        return {
            reportType: 'month-end',
            period: `${monthNames[month - 1]} ${year}`,
            month,
            year,
            entity: entity || 'All Entities',
            totalEmployees: new Set(filteredPayslips.map(p => p.employeeId.toString())).size,
            totalGrossSalary: Math.round(totalGrossSalary * 100) / 100,
            totalDeductions: Math.round(totalDeductions * 100) / 100,
            totalNetPay: Math.round(totalNetPay * 100) / 100,
            taxSummary,
            insuranceSummary,
            benefitsSummary: {
                allowances: Math.round(allowancesTotal * 100) / 100,
                bonuses: Math.round(bonusesTotal * 100) / 100,
                benefits: Math.round(benefitsTotal * 100) / 100,
                refunds: Math.round(refundsTotal * 100) / 100
            },
            payrollRuns: payrollRunIds.size,
            generatedAt: new Date()
        };
    }

    private async generateYearEndReport(year: number, entity?: string) {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];

        const monthlyBreakdown: any[] = [];
        
        for (let month = 1; month <= 12; month++) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59);

            const query: any = {
                createdAt: { $gte: startDate, $lte: endDate }
            };

            const payslips = await this.paySlipModel.find(query)
                .populate('payrollRunId')
                .exec();

            let filteredPayslips = payslips;
            if (entity) {
                filteredPayslips = payslips.filter(p => {
                    const run = p.payrollRunId as any;
                    return run && run.entity === entity;
                });
            }

            if (filteredPayslips.length > 0) {
                const monthGross = filteredPayslips.reduce((sum, p) => sum + p.totalGrossSalary, 0);
                const monthDeductions = filteredPayslips.reduce((sum, p) => sum + (p.totaDeductions || 0), 0);
                const monthNet = filteredPayslips.reduce((sum, p) => sum + p.netPay, 0);
                const monthEmployees = new Set(filteredPayslips.map(p => p.employeeId.toString())).size;
                const monthRuns = new Set(filteredPayslips.map(p => p.payrollRunId.toString())).size;

                monthlyBreakdown.push({
                    month,
                    monthName: monthNames[month - 1],
                    totalGrossSalary: Math.round(monthGross * 100) / 100,
                    totalDeductions: Math.round(monthDeductions * 100) / 100,
                    totalNetPay: Math.round(monthNet * 100) / 100,
                    employeeCount: monthEmployees,
                    payrollRuns: monthRuns
                });
            }
        }

        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year, 11, 31, 23, 59, 59);

        const allPayslips = await this.paySlipModel.find({
            createdAt: { $gte: yearStart, $lte: yearEnd }
        }).populate('payrollRunId').exec();

        let filteredYearPayslips = allPayslips;
        if (entity) {
            filteredYearPayslips = allPayslips.filter(p => {
                const run = p.payrollRunId as any;
                return run && run.entity === entity;
            });
        }

        const taxMap = new Map<string, number>();
        filteredYearPayslips.forEach(payslip => {
            payslip.deductionsDetails?.taxes?.forEach(tax => {
                const amount = (payslip.totalGrossSalary * tax.rate) / 100;
                taxMap.set(tax.name, (taxMap.get(tax.name) || 0) + amount);
            });
        });

        const taxSummary = Array.from(taxMap.entries()).map(([taxName, annualTotal]) => ({
            taxName,
            annualTotal: Math.round(annualTotal * 100) / 100
        }));

        const insuranceMap = new Map<string, { employee: number; employer: number }>();
        filteredYearPayslips.forEach(payslip => {
            payslip.deductionsDetails?.insurances?.forEach(insurance => {
                const employeeAmount = (payslip.totalGrossSalary * insurance.employeeRate) / 100;
                const employerAmount = (payslip.totalGrossSalary * insurance.employerRate) / 100;
                
                if (!insuranceMap.has(insurance.name)) {
                    insuranceMap.set(insurance.name, { employee: 0, employer: 0 });
                }
                
                const data = insuranceMap.get(insurance.name)!;
                data.employee += employeeAmount;
                data.employer += employerAmount;
            });
        });

        const insuranceSummary = Array.from(insuranceMap.entries()).map(([insuranceName, data]) => ({
            insuranceName,
            annualEmployeeContribution: Math.round(data.employee * 100) / 100,
            annualEmployerContribution: Math.round(data.employer * 100) / 100
        }));

        const annualGross = filteredYearPayslips.reduce((sum, p) => sum + p.totalGrossSalary, 0);
        const annualDeductions = filteredYearPayslips.reduce((sum, p) => sum + (p.totaDeductions || 0), 0);
        const annualNet = filteredYearPayslips.reduce((sum, p) => sum + p.netPay, 0);
        const annualTaxes = taxSummary.reduce((sum, t) => sum + t.annualTotal, 0);
        const annualInsurance = insuranceSummary.reduce((sum, i) => sum + i.annualEmployeeContribution + i.annualEmployerContribution, 0);

        let annualBenefits = 0;
        filteredYearPayslips.forEach(payslip => {
            payslip.earningsDetails?.allowances?.forEach(a => annualBenefits += a.amount);
            payslip.earningsDetails?.bonuses?.forEach(b => annualBenefits += b.amount);
            payslip.earningsDetails?.benefits?.forEach(b => annualBenefits += b.amount);
            payslip.earningsDetails?.refunds?.forEach(r => annualBenefits += r.amount);
        });

        return {
            reportType: 'year-end',
            year,
            entity: entity || 'All Entities',
            totalEmployees: new Set(filteredYearPayslips.map(p => p.employeeId.toString())).size,
            monthlyBreakdown,
            annualTotals: {
                totalGrossSalary: Math.round(annualGross * 100) / 100,
                totalDeductions: Math.round(annualDeductions * 100) / 100,
                totalNetPay: Math.round(annualNet * 100) / 100,
                totalTaxes: Math.round(annualTaxes * 100) / 100,
                totalInsurance: Math.round(annualInsurance * 100) / 100,
                totalBenefits: Math.round(annualBenefits * 100) / 100
            },
            taxSummary,
            insuranceSummary,
            generatedAt: new Date()
        };
    }

    // =====================================================
    // Finance Staff - Approved Disputes Management
    // =====================================================

    async getApprovedDisputesForFinance(): Promise<disputes[]> {
        return await this.disputesModel.find({ status: DisputeStatus.APPROVED })
            .populate('employeeId', 'firstName lastName employeeCode email')
            .populate('payslipId')
            .populate('payrollSpecialistId', 'firstName lastName')
            .populate('payrollManagerId', 'firstName lastName')
            .populate('financeStaffId', 'firstName lastName')
            .sort({ updatedAt: -1 })
            .exec();
    }

    async acknowledgeDisputeByFinance(disputeId: string, financeStaffId: string): Promise<disputes> {
        const dispute = await this.disputesModel.findById(disputeId);
        if (!dispute) {
            throw new NotFoundException('Dispute not found');
        }

        if (dispute.status !== DisputeStatus.APPROVED) {
            throw new BadRequestException('Can only acknowledge approved disputes');
        }

        // Assign finance staff member who acknowledged it
        dispute.financeStaffId = new Types.ObjectId(financeStaffId);
        return await dispute.save();
    }

    // =====================================================
    // Finance Staff - Approved Claims Management
    // =====================================================

    async getApprovedClaimsForFinance(): Promise<claims[]> {
        return await this.claimsModel.find({ status: ClaimStatus.APPROVED })
            .populate('employeeId', 'firstName lastName employeeCode email')
            .populate('payrollSpecialistId', 'firstName lastName')
            .populate('payrollManagerId', 'firstName lastName')
            .populate('financeStaffId', 'firstName lastName')
            .sort({ updatedAt: -1 })
            .exec();
    }

    // =====================================================
    // Finance Staff - View All Refunds
    // =====================================================

    async getAllRefunds(): Promise<refunds[]> {
        return await this.refundsModel.find()
            .populate('employeeId', 'firstName lastName employeeCode email')
            .populate('financeStaffId', 'firstName lastName')
            .populate('disputeId', 'disputeId description')
            .populate('claimId', 'claimId claimType description')
            .populate('paidInPayrollRunId', 'runId payrollPeriod')
            .sort({ createdAt: -1 })
            .exec();
    }

    // =====================================================
    // Department Payroll Reports
    // =====================================================

    async getAllDepartments() {
        return await this.departmentModel.find({ isActive: true })
            .select('_id name code')
            .sort({ name: 1 })
            .exec();
    }

    async generateDepartmentReport(dto: GenerateDepartmentReportDto): Promise<DepartmentReportResponse> {
        const { departmentId, startDate, endDate } = dto;

        // Get department info
        const department = await this.departmentModel.findById(departmentId);
        if (!department) {
            throw new NotFoundException('Department not found');
        }

        // Get all employees in this department
        const employees = await this.employeeModel.find({ 
            primaryDepartmentId: new Types.ObjectId(departmentId)
        }).select('_id firstName lastName employeeCode').exec();

        if (employees.length === 0) {
            throw new BadRequestException('No employees found in this department');
        }

        const employeeIds = employees.map(e => e._id);

        // Get all payslips for these employees in the date range
        const payslips = await this.paySlipModel.find({
            employeeId: { $in: employeeIds },
            createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
        })
        .populate('employeeId', 'firstName lastName employeeCode')
        .exec();

        if (payslips.length === 0) {
            throw new BadRequestException('No payroll data found for this department in the specified period');
        }

        // Calculate totals
        const totalGrossSalary = payslips.reduce((sum, p) => sum + p.totalGrossSalary, 0);
        const totalDeductions = payslips.reduce((sum, p) => sum + (p.totaDeductions || 0), 0);
        const totalNetPay = payslips.reduce((sum, p) => sum + p.netPay, 0);

        // Calculate taxes paid
        let taxesPaid = 0;
        payslips.forEach(payslip => {
            payslip.deductionsDetails?.taxes?.forEach(tax => {
                taxesPaid += (payslip.totalGrossSalary * tax.rate) / 100;
            });
        });

        // Calculate insurance paid
        let insurancePaid = 0;
        payslips.forEach(payslip => {
            payslip.deductionsDetails?.insurances?.forEach(insurance => {
                const employeeAmount = (payslip.totalGrossSalary * insurance.employeeRate) / 100;
                const employerAmount = (payslip.totalGrossSalary * insurance.employerRate) / 100;
                insurancePaid += employeeAmount + employerAmount;
            });
        });

        // Calculate benefits paid
        let benefitsPaid = 0;
        payslips.forEach(payslip => {
            payslip.earningsDetails?.allowances?.forEach(a => benefitsPaid += a.amount);
            payslip.earningsDetails?.bonuses?.forEach(b => benefitsPaid += b.amount);
            payslip.earningsDetails?.benefits?.forEach(b => benefitsPaid += b.amount);
            payslip.earningsDetails?.refunds?.forEach(r => benefitsPaid += r.amount);
        });

        // Group by employee for breakdown
        const employeeMap = new Map();
        payslips.forEach(payslip => {
            const empId = payslip.employeeId._id.toString();
            if (!employeeMap.has(empId)) {
                employeeMap.set(empId, {
                    employeeId: empId,
                    employeeName: `${(payslip.employeeId as any).firstName} ${(payslip.employeeId as any).lastName}`,
                    employeeCode: (payslip.employeeId as any).employeeCode,
                    totalGrossSalary: 0,
                    totalDeductions: 0,
                    totalNetPay: 0,
                    payslipsCount: 0
                });
            }
            const empData = employeeMap.get(empId);
            empData.totalGrossSalary += payslip.totalGrossSalary;
            empData.totalDeductions += payslip.totaDeductions || 0;
            empData.totalNetPay += payslip.netPay;
            empData.payslipsCount++;
        });

        const employeeBreakdown = Array.from(employeeMap.values()).map(emp => ({
            ...emp,
            totalGrossSalary: Math.round(emp.totalGrossSalary * 100) / 100,
            totalDeductions: Math.round(emp.totalDeductions * 100) / 100,
            totalNetPay: Math.round(emp.totalNetPay * 100) / 100
        }));

        // Sort by gross salary descending
        employeeBreakdown.sort((a, b) => b.totalGrossSalary - a.totalGrossSalary);

        const salaries = employeeBreakdown.map(e => e.totalGrossSalary);

        return {
            reportType: 'department-payroll',
            department: {
                id: department._id.toString(),
                name: department.name,
                code: department.code
            },
            period: `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`,
            totalEmployees: employees.length,
            salaryDistribution: {
                totalGrossSalary: Math.round(totalGrossSalary * 100) / 100,
                totalDeductions: Math.round(totalDeductions * 100) / 100,
                totalNetPay: Math.round(totalNetPay * 100) / 100,
                averageGrossSalary: Math.round((totalGrossSalary / employees.length) * 100) / 100,
                averageNetPay: Math.round((totalNetPay / employees.length) * 100) / 100,
                highestSalary: Math.max(...salaries),
                lowestSalary: Math.min(...salaries)
            },
            employeeBreakdown,
            budgetAnalysis: {
                totalPayrollCost: Math.round(totalGrossSalary * 100) / 100,
                taxesPaid: Math.round(taxesPaid * 100) / 100,
                insurancePaid: Math.round(insurancePaid * 100) / 100,
                benefitsPaid: Math.round(benefitsPaid * 100) / 100
            },
            generatedAt: new Date()
        };
    }
}

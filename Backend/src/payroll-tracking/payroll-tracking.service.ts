import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { disputes, disputesDocument } from './models/disputes.schema';
import { claims, claimsDocument } from './models/claims.schema';
import { refunds, refundsDocument } from './models/refunds.schema';
import { DisputeStatus, ClaimStatus, RefundStatus } from './enums/payroll-tracking-enum';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { CreateClaimDto } from './dto/create-claim.dto';

@Injectable()
export class PayrollTrackingService {
    constructor(
        @InjectModel(disputes.name) private disputesModel: Model<disputesDocument>,
        @InjectModel(claims.name) private claimsModel: Model<claimsDocument>,
        @InjectModel(refunds.name) private refundsModel: Model<refundsDocument>,
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
        return await this.disputesModel.find({ employeeId })
            .populate('payslipId')
            .populate('financeStaffId', 'firstName lastName')
            .sort({ createdAt: -1 })
            .exec();
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
            .populate('financeStaffId', 'firstName lastName')
            .sort({ createdAt: -1 })
            .exec();
    }

    // =====================================================
    // PHASE 3: Dispute Approval Workflow
    // =====================================================

    async approveDispute(disputeId: string, financeStaffId: string, resolutionComment?: string): Promise<disputes> {
        const dispute = await this.disputesModel.findById(disputeId);
        if (!dispute) {
            throw new NotFoundException('Dispute not found');
        }

        if (dispute.status !== DisputeStatus.UNDER_REVIEW) {
            throw new BadRequestException('Can only approve disputes under review');
        }

        dispute.status = DisputeStatus.APPROVED;
        dispute.financeStaffId = new Types.ObjectId(financeStaffId);
        dispute.resolutionComment = resolutionComment;
        return await dispute.save();
    }

    async rejectDispute(disputeId: string, financeStaffId: string, rejectionReason: string): Promise<disputes> {
        const dispute = await this.disputesModel.findById(disputeId);
        if (!dispute) {
            throw new NotFoundException('Dispute not found');
        }

        if (dispute.status !== DisputeStatus.UNDER_REVIEW) {
            throw new BadRequestException('Can only reject disputes under review');
        }

        dispute.status = DisputeStatus.REJECTED;
        dispute.financeStaffId = new Types.ObjectId(financeStaffId);
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
        return await this.claimsModel.find({ employeeId })
            .populate('financeStaffId', 'firstName lastName')
            .sort({ createdAt: -1 })
            .exec();
    }

    async getClaimById(claimId: string): Promise<claims> {
        const claim = await this.claimsModel.findById(claimId)
            .populate('employeeId', 'firstName lastName employeeCode')
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
            .populate('employeeId', 'firstName lastName employeeCode')
            .populate('financeStaffId', 'firstName lastName')
            .sort({ createdAt: -1 })
            .exec();
    }

    // =====================================================
    // PHASE 3: Claim Approval Workflow
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
}

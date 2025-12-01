import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { PayrollTrackingService } from './payroll-tracking.service';
import { AuthGuard } from '../auth/gaurds/authentication.guard';
import { authorizationGaurd } from '../auth/middleware/authorization.middleware';
import { Roles, Role } from '../auth/decorators/roles.decorator';
import { DisputeStatus, ClaimStatus } from './enums/payroll-tracking-enum';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { ApproveDisputeDto } from './dto/approve-dispute.dto';
import { RejectDisputeDto } from './dto/reject-dispute.dto';
import { CreateClaimDto } from './dto/create-claim.dto';
import { ApproveClaimDto } from './dto/approve-claim.dto';
import { RejectClaimDto } from './dto/reject-claim.dto';

@Controller('payroll-tracking')
export class PayrollTrackingController {
    constructor(private readonly payrollTrackingService: PayrollTrackingService) {}

    // =====================================================
    // Employee Self-Service - Disputes
    // =====================================================

    @Post('disputes')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.DEPARTMENT_EMPLOYEE, Role.SYSTEM_ADMIN)
    async createDispute(@Body() dto: CreateDisputeDto, @Req() req: any) {
        return await this.payrollTrackingService.createDispute(dto, req.user.userId);
    }

    @Get('disputes/my')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.DEPARTMENT_EMPLOYEE, Role.SYSTEM_ADMIN)
    async getMyDisputes(@Req() req: any) {
        return await this.payrollTrackingService.getEmployeeDisputes(req.user.userId);
    }

    @Get('disputes')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.HR_MANAGER, Role.SYSTEM_ADMIN)
    async getAllDisputes(@Query('status') status?: DisputeStatus) {
        return await this.payrollTrackingService.getAllDisputes(status);
    }

    @Get('disputes/:id')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.DEPARTMENT_EMPLOYEE, Role.PAYROLL_SPECIALIST, Role.HR_MANAGER, Role.SYSTEM_ADMIN)
    async getDisputeById(@Param('id') id: string) {
        return await this.payrollTrackingService.getDisputeById(id);
    }

    // =====================================================
    // Dispute Approval Workflow
    // =====================================================

    @Post('disputes/:id/approve')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.SYSTEM_ADMIN)
    async approveDispute(@Param('id') id: string, @Body() dto: ApproveDisputeDto, @Req() req: any) {
        return await this.payrollTrackingService.approveDispute(id, req.user.userId, dto.resolutionComment);
    }

    @Post('disputes/:id/reject')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.SYSTEM_ADMIN)
    async rejectDispute(@Param('id') id: string, @Body() dto: RejectDisputeDto, @Req() req: any) {
        return await this.payrollTrackingService.rejectDispute(id, req.user.userId, dto.rejectionReason);
    }

    // =====================================================
    // Employee Self-Service - Claims
    // =====================================================

    @Post('claims')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.DEPARTMENT_EMPLOYEE, Role.SYSTEM_ADMIN)
    async createClaim(@Body() dto: CreateClaimDto, @Req() req: any) {
        return await this.payrollTrackingService.createClaim(dto, req.user.userId);
    }

    @Get('claims/my')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.DEPARTMENT_EMPLOYEE, Role.SYSTEM_ADMIN)
    async getMyClaims(@Req() req: any) {
        return await this.payrollTrackingService.getEmployeeClaims(req.user.userId);
    }

    @Get('claims')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.HR_MANAGER, Role.SYSTEM_ADMIN)
    async getAllClaims(@Query('status') status?: ClaimStatus) {
        return await this.payrollTrackingService.getAllClaims(status);
    }

    @Get('claims/:id')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.DEPARTMENT_EMPLOYEE, Role.PAYROLL_SPECIALIST, Role.HR_MANAGER, Role.SYSTEM_ADMIN)
    async getClaimById(@Param('id') id: string) {
        return await this.payrollTrackingService.getClaimById(id);
    }

    // =====================================================
    // Claim Approval Workflow
    // =====================================================

    @Post('claims/:id/approve')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.SYSTEM_ADMIN)
    async approveClaim(@Param('id') id: string, @Body() dto: ApproveClaimDto, @Req() req: any) {
        return await this.payrollTrackingService.approveClaim(id, req.user.userId, dto.approvedAmount, dto.resolutionComment);
    }

    @Post('claims/:id/reject')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.SYSTEM_ADMIN)
    async rejectClaim(@Param('id') id: string, @Body() dto: RejectClaimDto, @Req() req: any) {
        return await this.payrollTrackingService.rejectClaim(id, req.user.userId, dto.rejectionReason);
    }

    // =====================================================
    // Refund Management
    // =====================================================

    @Post('refunds/dispute/:disputeId')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.SYSTEM_ADMIN)
    async generateDisputeRefund(@Param('disputeId') disputeId: string, @Req() req: any) {
        return await this.payrollTrackingService.generateDisputeRefund(disputeId, req.user.userId);
    }

    @Post('refunds/claim/:claimId')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.SYSTEM_ADMIN)
    async generateClaimRefund(@Param('claimId') claimId: string, @Req() req: any) {
        return await this.payrollTrackingService.generateClaimRefund(claimId, req.user.userId);
    }

    @Get('refunds/pending')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.SYSTEM_ADMIN)
    async getPendingRefunds() {
        return await this.payrollTrackingService.getPendingRefunds();
    }

    @Get('refunds/my')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.DEPARTMENT_EMPLOYEE, Role.SYSTEM_ADMIN)
    async getMyRefunds(@Req() req: any) {
        return await this.payrollTrackingService.getEmployeeRefunds(req.user.userId);
    }

    @Post('refunds/:id/mark-paid')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.SYSTEM_ADMIN)
    async markRefundAsPaid(@Param('id') id: string, @Query('payrollRunId') payrollRunId: string) {
        return await this.payrollTrackingService.markRefundAsPaid(id, payrollRunId);
    }

    // =====================================================
    // Reports and Statistics
    // =====================================================

    @Get('statistics/disputes')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.HR_MANAGER, Role.SYSTEM_ADMIN)
    async getDisputeStatistics() {
        return await this.payrollTrackingService.getDisputeStatistics();
    }

    @Get('statistics/claims')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.HR_MANAGER, Role.SYSTEM_ADMIN)
    async getClaimStatistics() {
        return await this.payrollTrackingService.getClaimStatistics();
    }

    @Get('statistics/refunds')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.HR_MANAGER, Role.SYSTEM_ADMIN)
    async getRefundStatistics() {
        return await this.payrollTrackingService.getRefundStatistics();
    }
}

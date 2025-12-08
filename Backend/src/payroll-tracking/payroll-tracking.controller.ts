import { Controller, Get, Post, Body, Param, Query, UseGuards, Req, UsePipes, ValidationPipe } from '@nestjs/common';
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
import { GenerateFinanceReportDto } from './dto/finance-reports.dto';
import { GenerateDepartmentReportDto } from './dto/department-report.dto';

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
        return await this.payrollTrackingService.createDispute(dto, req.user.sub);
    }

    @Get('disputes/my')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.DEPARTMENT_EMPLOYEE, Role.SYSTEM_ADMIN)
    async getMyDisputes(@Req() req: any) {
        return await this.payrollTrackingService.getEmployeeDisputes(req.user.sub);
    }

    @Get('disputes')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.HR_MANAGER, Role.SYSTEM_ADMIN)
    async getAllDisputes(@Query('status') status?: DisputeStatus) {
        return await this.payrollTrackingService.getAllDisputes(status);
    }

    @Get('disputes/pending-manager-approval')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async getDisputesPendingManagerApproval() {
        return await this.payrollTrackingService.getDisputesPendingManagerApproval();
    }

    @Get('disputes/:id')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.DEPARTMENT_EMPLOYEE, Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.HR_MANAGER, Role.SYSTEM_ADMIN)
    async getDisputeById(@Param('id') id: string) {
        return await this.payrollTrackingService.getDisputeById(id);
    }

    // =====================================================
    // Dispute Approval Workflow
    // =====================================================

    @Post('disputes/:id/approve')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async approveDispute(@Param('id') id: string, @Body() dto: ApproveDisputeDto, @Req() req: any) {
        return await this.payrollTrackingService.approveDisputeBySpecialist(id, req.user.sub, dto.resolutionComment);
    }

    @Post('disputes/:id/reject')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async rejectDispute(@Param('id') id: string, @Body() dto: RejectDisputeDto, @Req() req: any) {
        return await this.payrollTrackingService.rejectDispute(id, req.user.sub, dto.rejectionReason);
    }

    // =====================================================
    // Manager-Only Dispute Approval
    // =====================================================

    @Post('disputes/:id/manager-approve')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async managerApproveDispute(@Param('id') id: string, @Body() dto: ApproveDisputeDto, @Req() req: any) {
        return await this.payrollTrackingService.managerApproveDispute(id, req.user.sub, dto.resolutionComment);
    }

    @Post('disputes/:id/manager-reject')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async managerRejectDispute(@Param('id') id: string, @Body() dto: RejectDisputeDto, @Req() req: any) {
        return await this.payrollTrackingService.managerRejectDispute(id, req.user.sub, dto.rejectionReason);
    }

    // =====================================================
    // Employee Self-Service - Claims
    // =====================================================

    @Post('claims')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.DEPARTMENT_EMPLOYEE, Role.SYSTEM_ADMIN)
    async createClaim(@Body() dto: CreateClaimDto, @Req() req: any) {
        return await this.payrollTrackingService.createClaim(dto, req.user.sub);
    }

    @Get('claims/my')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.DEPARTMENT_EMPLOYEE, Role.SYSTEM_ADMIN)
    async getMyClaims(@Req() req: any) {
        return await this.payrollTrackingService.getEmployeeClaims(req.user.sub);
    }

    @Get('claims')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.HR_MANAGER, Role.SYSTEM_ADMIN)
    async getAllClaims(@Query('status') status?: ClaimStatus) {
        return await this.payrollTrackingService.getAllClaims(status);
    }

    @Get('claims/pending-manager-approval')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async getClaimsPendingManagerApproval() {
        return await this.payrollTrackingService.getClaimsPendingManagerApproval();
    }

    @Get('claims/:id')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.DEPARTMENT_EMPLOYEE, Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.HR_MANAGER, Role.SYSTEM_ADMIN)
    async getClaimById(@Param('id') id: string) {
        return await this.payrollTrackingService.getClaimById(id);
    }

    // =====================================================
    // Claim Approval Workflow - Specialist Level
    // =====================================================

    @Post('claims/:id/approve')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.SYSTEM_ADMIN)
    async approveClaimBySpecialist(@Param('id') id: string, @Body() dto: ApproveClaimDto, @Req() req: any) {
        return await this.payrollTrackingService.approveClaimBySpecialist(id, req.user.sub, dto.approvedAmount, dto.resolutionComment);
    }

    @Post('claims/:id/reject')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.SYSTEM_ADMIN)
    async rejectClaimBySpecialist(@Param('id') id: string, @Body() dto: RejectClaimDto, @Req() req: any) {
        return await this.payrollTrackingService.rejectClaimBySpecialist(id, req.user.sub, dto.rejectionReason);
    }

    // =====================================================
    // Claim Approval Workflow - Manager Level
    // =====================================================

    @Post('claims/:id/manager-approve')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async managerApproveClaim(@Param('id') id: string, @Body() dto: ApproveClaimDto, @Req() req: any) {
        return await this.payrollTrackingService.managerApproveClaim(id, req.user.sub, dto.resolutionComment);
    }

    @Post('claims/:id/manager-reject')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async managerRejectClaim(@Param('id') id: string, @Body() dto: RejectClaimDto, @Req() req: any) {
        return await this.payrollTrackingService.managerRejectClaim(id, req.user.sub, dto.rejectionReason);
    }

    // =====================================================
    // Refund Management
    // =====================================================

    @Post('refunds/dispute/:disputeId')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.SYSTEM_ADMIN)
    async generateDisputeRefund(@Param('disputeId') disputeId: string, @Req() req: any) {
        return await this.payrollTrackingService.generateDisputeRefund(disputeId, req.user.sub);
    }

    @Post('refunds/claim/:claimId')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.SYSTEM_ADMIN)
    async generateClaimRefund(@Param('claimId') claimId: string, @Req() req: any) {
        return await this.payrollTrackingService.generateClaimRefund(claimId, req.user.sub);
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
        return await this.payrollTrackingService.getEmployeeRefunds(req.user.sub);
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

    // =====================================================
    // Finance Reports
    // =====================================================

    @Post('reports/generate')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.FINANCE_STAFF, Role.SYSTEM_ADMIN)
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    async generateFinanceReport(@Body() dto: GenerateFinanceReportDto) {
        return await this.payrollTrackingService.generateFinanceReport(dto);
    }

    // =====================================================
    // Finance Staff - Approved Disputes
    // =====================================================

    @Get('finance/approved-disputes')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.FINANCE_STAFF, Role.SYSTEM_ADMIN)
    async getApprovedDisputesForFinance() {
        return await this.payrollTrackingService.getApprovedDisputesForFinance();
    }

    @Get('finance/approved-disputes/:id')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.FINANCE_STAFF, Role.SYSTEM_ADMIN)
    async getApprovedDisputeDetails(@Param('id') id: string) {
        return await this.payrollTrackingService.getDisputeById(id);
    }

    @Post('finance/approved-disputes/:id/acknowledge')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.FINANCE_STAFF, Role.SYSTEM_ADMIN)
    async acknowledgeDispute(@Param('id') id: string, @Req() req: any) {
        return await this.payrollTrackingService.acknowledgeDisputeByFinance(id, req.user.sub);
    }

    @Post('finance/approved-disputes/:id/generate-refund')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.FINANCE_STAFF, Role.SYSTEM_ADMIN)
    async generateRefundForDispute(@Param('id') id: string, @Req() req: any) {
        return await this.payrollTrackingService.generateDisputeRefund(id, req.user.sub);
    }

    // =====================================================
    // Finance Staff - Approved Claims
    // =====================================================

    @Get('finance/approved-claims')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.FINANCE_STAFF, Role.SYSTEM_ADMIN)
    async getApprovedClaimsForFinance() {
        return await this.payrollTrackingService.getApprovedClaimsForFinance();
    }

    @Get('finance/approved-claims/:id')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.FINANCE_STAFF, Role.SYSTEM_ADMIN)
    async getApprovedClaimDetails(@Param('id') id: string) {
        return await this.payrollTrackingService.getClaimById(id);
    }

    @Post('finance/approved-claims/:id/generate-refund')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.FINANCE_STAFF, Role.SYSTEM_ADMIN)
    async generateRefundForClaim(@Param('id') id: string, @Req() req: any) {
        return await this.payrollTrackingService.generateClaimRefund(id, req.user.sub);
    }

    // =====================================================
    // Finance Staff - View All Refunds
    // =====================================================

    @Get('finance/refunds')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.FINANCE_STAFF, Role.SYSTEM_ADMIN)
    async getAllRefundsForFinance() {
        return await this.payrollTrackingService.getAllRefunds();
    }

    // =====================================================
    // Department Payroll Reports
    // =====================================================

    @Post('reports/department')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    async generateDepartmentReport(@Body() dto: GenerateDepartmentReportDto) {
        return await this.payrollTrackingService.generateDepartmentReport(dto);
    }

    @Get('reports/departments')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async getAllDepartments() {
        return await this.payrollTrackingService.getAllDepartments();
    }
}

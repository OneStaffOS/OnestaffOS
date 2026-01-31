import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { PayrollExecutionService } from './payroll-execution.service';
import { SignedActionDto } from '../banking-contracts/dto/signed-action.dto';
import { AuthGuard } from '../auth/gaurds/authentication.guard';
import { authorizationGaurd } from '../auth/middleware/authorization.middleware';
import { Roles, Role } from '../auth/decorators/roles.decorator';
import { PayRollStatus, PayRollPaymentStatus } from './enums/payroll-execution-enum';
import { CreatePayrollRunDto } from './dto/create-payroll-run.dto';
import { ApprovePayrollDto } from './dto/approve-payroll.dto';
import { RejectPayrollDto } from './dto/reject-payroll.dto';
import { LockPayrollDto } from './dto/lock-payroll.dto';
import { UnlockPayrollDto } from './dto/unlock-payroll.dto';

@Controller('payroll-execution')
export class PayrollExecutionController {
    constructor(private readonly payrollExecutionService: PayrollExecutionService) {}

    // =====================================================
    // Pre-Run Reviews - Signing Bonuses
    // =====================================================

    @Get('signing-bonuses/pending')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.HR_MANAGER, Role.SYSTEM_ADMIN)
    async getPendingSigningBonuses() {
        return await this.payrollExecutionService.getPendingSigningBonuses();
    }

    @Post('signing-bonuses/:id/approve')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.HR_MANAGER, Role.SYSTEM_ADMIN)
    async approveSigningBonus(@Param('id') id: string, @Req() req: any) {
        return await this.payrollExecutionService.approveSigningBonus(id, req.user.userId);
    }

    @Post('signing-bonuses/:id/reject')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.HR_MANAGER, Role.SYSTEM_ADMIN)
    async rejectSigningBonus(@Param('id') id: string, @Req() req: any) {
        return await this.payrollExecutionService.rejectSigningBonus(id, req.user.userId);
    }

    // =====================================================
    // Pre-Run Reviews - Termination Benefits
    // =====================================================

    @Get('termination-benefits/pending')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.HR_MANAGER, Role.SYSTEM_ADMIN)
    async getPendingTerminationBenefits() {
        return await this.payrollExecutionService.getPendingTerminationBenefits();
    }

    @Post('termination-benefits/:id/approve')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.HR_MANAGER, Role.SYSTEM_ADMIN)
    async approveTerminationBenefits(@Param('id') id: string, @Req() req: any) {
        return await this.payrollExecutionService.approveTerminationBenefits(id, req.user.userId);
    }

    @Post('termination-benefits/:id/reject')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.HR_MANAGER, Role.SYSTEM_ADMIN)
    async rejectTerminationBenefits(@Param('id') id: string, @Req() req: any) {
        return await this.payrollExecutionService.rejectTerminationBenefits(id, req.user.userId);
    }

    // =====================================================
    // Payroll Run Management
    // =====================================================

    @Post('runs')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async createPayrollRun(@Body() dto: CreatePayrollRunDto, @Req() req: any) {
        return await this.payrollExecutionService.createPayrollRun(dto, req.user.userId);
    }

    @Get('runs')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.HR_MANAGER, Role.SYSTEM_ADMIN, Role.FINANCE_STAFF, Role.PAYROLL_MANAGER)
    async getAllPayrollRuns(@Query('status') status?: PayRollStatus) {
        return await this.payrollExecutionService.getAllPayrollRuns(status);
    }

    @Get('runs/:id')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.HR_MANAGER, Role.SYSTEM_ADMIN, Role.FINANCE_STAFF, Role.PAYROLL_MANAGER)
    async getPayrollRunById(@Param('id') id: string) {
        return await this.payrollExecutionService.getPayrollRunById(id);
    }

    @Get('runs/:id/employee-details')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.HR_MANAGER, Role.SYSTEM_ADMIN, Role.FINANCE_STAFF, Role.PAYROLL_MANAGER)
    async getEmployeePayrollDetailsByRunId(@Param('id') id: string) {
        return await this.payrollExecutionService.getEmployeePayrollDetailsByRunId(id);
    }

    // =====================================================
    // Review and Flag Exceptions
    // =====================================================

    @Post('runs/:id/flag-exceptions')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async flagExceptions(@Param('id') id: string) {
        return await this.payrollExecutionService.flagExceptions(id);
    }

    // =====================================================
    // Approval Workflow
    // =====================================================

    @Post('runs/:id/publish')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async publishForReview(@Param('id') id: string) {
        return await this.payrollExecutionService.publishForReview(id);
    }

    @Post('runs/:id/submit-for-review')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.SYSTEM_ADMIN)
    async submitForReview(@Param('id') id: string) {
        return await this.payrollExecutionService.submitForReview(id);
    }

    @Post('runs/:id/manager-approve')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.HR_MANAGER, Role.SYSTEM_ADMIN)
    async managerApprovePayroll(@Param('id') id: string, @Req() req: any) {
        return await this.payrollExecutionService.managerApprovePayroll(id, req.user.userId);
    }

    @Post('runs/:id/finance-approve')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.SYSTEM_ADMIN, Role.FINANCE_STAFF)
    async financeApprovePayroll(
        @Param('id') id: string,
        @Body() dto: SignedActionDto,
        @Req() req: any,
    ) {
        const roles = req.user.roles || [];
        return await this.payrollExecutionService.financeApprovePayroll(id, req.user.userId, roles, dto);
    }

    @Post('runs/:id/reject')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.HR_MANAGER, Role.SYSTEM_ADMIN, Role.FINANCE_STAFF)
    async rejectPayroll(@Param('id') id: string, @Body() dto: RejectPayrollDto, @Req() req: any) {
        return await this.payrollExecutionService.rejectPayroll(id, req.user.userId, dto.rejectionReason);
    }

    @Post('runs/:id/lock')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.HR_MANAGER, Role.SYSTEM_ADMIN, Role.PAYROLL_MANAGER)
    async lockPayroll(@Param('id') id: string, @Req() req: any) {
        return await this.payrollExecutionService.lockPayroll(id, req.user.userId);
    }

    @Post('runs/:id/unlock')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.HR_MANAGER, Role.SYSTEM_ADMIN, Role.PAYROLL_MANAGER)
    async unlockPayroll(@Param('id') id: string, @Body() dto: UnlockPayrollDto, @Req() req: any) {
        return await this.payrollExecutionService.unlockPayroll(id, req.user.userId, dto.unlockReason);
    }

    // =====================================================
    // Payslip Generation and Management
    // =====================================================

    @Post('runs/:id/generate-payslips')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async generatePayslips(@Param('id') id: string) {
        return await this.payrollExecutionService.generatePayslips(id);
    }

    @Get('runs/:id/payslips')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.HR_MANAGER, Role.SYSTEM_ADMIN)
    async getPayslipsByRunId(@Param('id') id: string) {
        return await this.payrollExecutionService.getPayslipsByRunId(id);
    }

    @Get('employees/:employeeId/payslips')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.DEPARTMENT_EMPLOYEE, Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.HR_MANAGER, Role.SYSTEM_ADMIN)
    async getEmployeePayslips(@Param('employeeId') employeeId: string) {
        return await this.payrollExecutionService.getEmployeePayslips(employeeId);
    }

    @Post('runs/:id/payment-status')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.SYSTEM_ADMIN)
    async updatePaymentStatus(@Param('id') id: string, @Query('status') status: PayRollPaymentStatus) {
        return await this.payrollExecutionService.updatePaymentStatus(id, status);
    }
}

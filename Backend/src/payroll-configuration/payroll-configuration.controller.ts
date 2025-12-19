import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards, Req, Res } from '@nestjs/common';
import { PayrollConfigurationService } from './payroll-configuration.service';
import { AuthGuard } from '../auth/gaurds/authentication.guard';
import { authorizationGaurd } from '../auth/middleware/authorization.middleware';
import { Roles, Role } from '../auth/decorators/roles.decorator';
import { ConfigStatus } from './enums/payroll-configuration-enums';
import { CreatePayrollPolicyDto } from './dto/create-payroll-policy.dto';
import { UpdatePayrollPolicyDto } from './dto/update-payroll-policy.dto';
import { CreatePayGradeDto } from './dto/create-pay-grade.dto';
import { UpdatePayGradeDto } from './dto/update-pay-grade.dto';
import { CreatePayTypeDto } from './dto/create-pay-type.dto';
import { CreateAllowanceDto } from './dto/create-allowance.dto';
import { UpdateAllowanceDto } from './dto/update-allowance.dto';
import { CreateSigningBonusDto } from './dto/create-signing-bonus.dto';
import { UpdateSigningBonusDto } from './dto/update-signing-bonus.dto';
import { CreateTerminationBenefitsDto } from './dto/create-termination-benefits.dto';
import { UpdateTerminationBenefitsDto } from './dto/update-termination-benefits.dto';
import { CreateTaxRuleDto } from './dto/create-tax-rule.dto';
import { UpdateTaxRuleDto } from './dto/update-tax-rule.dto';
import { CreateInsuranceBracketDto } from './dto/create-insurance-bracket.dto';
import { UpdateInsuranceBracketDto } from './dto/update-insurance-bracket.dto';
import { CreateCompanySettingsDto } from './dto/create-company-settings.dto';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';

@Controller('payroll-configuration')
export class PayrollConfigurationController {
    constructor(private readonly payrollConfigurationService: PayrollConfigurationService) {}

    // =====================================================
    // Payroll Policies Endpoints
    // =====================================================

    @Post('policies')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async createPayrollPolicy(@Body() dto: CreatePayrollPolicyDto, @Req() req: any) {
        return await this.payrollConfigurationService.createPayrollPolicy(dto, req.user.sub);
    }

    @Put('policies/:id')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async updatePayrollPolicy(@Param('id') id: string, @Body() dto: UpdatePayrollPolicyDto, @Req() req: any) {
        return await this.payrollConfigurationService.updatePayrollPolicy(id, dto, req.user.sub);
    }

    @Get('policies')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async getAllPayrollPolicies(@Query('status') status?: ConfigStatus) {
        return await this.payrollConfigurationService.getAllPayrollPolicies(status);
    }

    @Get('policies/:id')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async getPayrollPolicyById(@Param('id') id: string) {
        return await this.payrollConfigurationService.getPayrollPolicyById(id);
    }

    @Delete('policies/:id')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async deletePayrollPolicy(@Param('id') id: string, @Req() req: any) {
        return await this.payrollConfigurationService.deletePayrollPolicy(id, req.user.sub);
    }

    @Post('policies/:id/approve')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async approvePayrollPolicy(@Param('id') id: string, @Req() req: any) {
        return await this.payrollConfigurationService.approvePayrollPolicy(id, req.user.sub);
    }

    @Post('policies/:id/reject')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async rejectPayrollPolicy(@Param('id') id: string, @Req() req: any) {
        return await this.payrollConfigurationService.rejectPayrollPolicy(id, req.user.sub);
    }

    // =====================================================
    // Pay Grades Endpoints
    // =====================================================

    @Post('pay-grades')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async createPayGrade(@Body() dto: CreatePayGradeDto, @Req() req: any) {
        return await this.payrollConfigurationService.createPayGrade(dto, req.user.sub);
    }

    @Put('pay-grades/:id')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async updatePayGrade(@Param('id') id: string, @Body() dto: UpdatePayGradeDto, @Req() req: any) {
        return await this.payrollConfigurationService.updatePayGrade(id, dto, req.user.sub);
    }

    @Get('pay-grades')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async getAllPayGrades(@Query('status') status?: ConfigStatus) {
        return await this.payrollConfigurationService.getAllPayGrades(status);
    }

    @Get('pay-grades/:id')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async getPayGradeById(@Param('id') id: string) {
        return await this.payrollConfigurationService.getPayGradeById(id);
    }

    @Delete('pay-grades/:id')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async deletePayGrade(@Param('id') id: string, @Req() req: any) {
        return await this.payrollConfigurationService.deletePayGrade(id, req.user.sub);
    }

    @Post('pay-grades/:id/approve')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async approvePayGrade(@Param('id') id: string, @Req() req: any) {
        return await this.payrollConfigurationService.approvePayGrade(id, req.user.sub);
    }

    @Post('pay-grades/:id/reject')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async rejectPayGrade(@Param('id') id: string, @Req() req: any) {
        return await this.payrollConfigurationService.rejectPayGrade(id, req.user.sub);
    }

    // =====================================================
    // Pay Types Endpoints
    // =====================================================

    @Post('pay-types')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async createPayType(@Body() dto: CreatePayTypeDto, @Req() req: any) {
        return await this.payrollConfigurationService.createPayType(dto, req.user.sub);
    }

    @Get('pay-types')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async getAllPayTypes(@Query('status') status?: ConfigStatus) {
        return await this.payrollConfigurationService.getAllPayTypes(status);
    }

    @Get('pay-types/:id')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async getPayTypeById(@Param('id') id: string) {
        return await this.payrollConfigurationService.getPayTypeById(id);
    }

    @Delete('pay-types/:id')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async deletePayType(@Param('id') id: string, @Req() req: any) {
        return await this.payrollConfigurationService.deletePayType(id, req.user.sub);
    }

    @Post('pay-types/:id/approve')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async approvePayType(@Param('id') id: string, @Req() req: any) {
        return await this.payrollConfigurationService.approvePayType(id, req.user.sub);
    }

    @Post('pay-types/:id/reject')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async rejectPayType(@Param('id') id: string, @Req() req: any) {
        return await this.payrollConfigurationService.rejectPayType(id, req.user.sub);
    }

    // =====================================================
    // Allowances Endpoints
    // =====================================================

    @Post('allowances')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async createAllowance(@Body() dto: CreateAllowanceDto, @Req() req: any) {
        return await this.payrollConfigurationService.createAllowance(dto, req.user.sub);
    }

    @Put('allowances/:id')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async updateAllowance(@Param('id') id: string, @Body() dto: UpdateAllowanceDto, @Req() req: any) {
        return await this.payrollConfigurationService.updateAllowance(id, dto, req.user.sub);
    }

    @Get('allowances')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async getAllAllowances(@Query('status') status?: ConfigStatus) {
        return await this.payrollConfigurationService.getAllAllowances(status);
    }

    @Get('allowances/:id')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async getAllowanceById(@Param('id') id: string) {
        return await this.payrollConfigurationService.getAllowanceById(id);
    }

    @Delete('allowances/:id')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async deleteAllowance(@Param('id') id: string, @Req() req: any) {
        return await this.payrollConfigurationService.deleteAllowance(id, req.user.sub);
    }

    @Post('allowances/:id/approve')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async approveAllowance(@Param('id') id: string, @Req() req: any) {
        return await this.payrollConfigurationService.approveAllowance(id, req.user.sub);
    }

    @Post('allowances/:id/reject')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async rejectAllowance(@Param('id') id: string, @Req() req: any) {
        return await this.payrollConfigurationService.rejectAllowance(id, req.user.sub);
    }

    // =====================================================
    // Signing Bonuses Endpoints
    // =====================================================

    @Post('signing-bonuses')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async createSigningBonus(@Body() dto: CreateSigningBonusDto, @Req() req: any) {
        return await this.payrollConfigurationService.createSigningBonus(dto, req.user.sub);
    }

    @Put('signing-bonuses/:id')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async updateSigningBonus(@Param('id') id: string, @Body() dto: UpdateSigningBonusDto, @Req() req: any) {
        return await this.payrollConfigurationService.updateSigningBonus(id, dto, req.user.sub);
    }

    @Patch('signing-bonuses/:id')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async patchSigningBonus(@Param('id') id: string, @Body() dto: UpdateSigningBonusDto, @Req() req: any) {
        return await this.payrollConfigurationService.updateSigningBonus(id, dto, req.user.sub);
    }

    @Get('signing-bonuses/draft')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async getDraftSigningBonuses() {
        return await this.payrollConfigurationService.getAllSigningBonuses(ConfigStatus.DRAFT);
    }

    @Get('signing-bonuses/:id')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async getSigningBonusById(@Param('id') id: string) {
        return await this.payrollConfigurationService.getSigningBonusById(id);
    }

    @Get('signing-bonuses')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async getAllSigningBonuses(@Query('status') status?: ConfigStatus) {
        return await this.payrollConfigurationService.getAllSigningBonuses(status);
    }

    @Delete('signing-bonuses/:id')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async deleteSigningBonus(@Param('id') id: string, @Req() req: any) {
        return await this.payrollConfigurationService.deleteSigningBonus(id, req.user.sub);
    }

    @Post('signing-bonuses/:id/approve')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async approveSigningBonus(@Param('id') id: string, @Req() req: any) {
        return await this.payrollConfigurationService.approveSigningBonus(id, req.user.sub);
    }

    @Post('signing-bonuses/:id/reject')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async rejectSigningBonus(@Param('id') id: string, @Req() req: any) {
        return await this.payrollConfigurationService.rejectSigningBonus(id, req.user.sub);
    }

    // =====================================================
    // Termination Benefits Endpoints
    // =====================================================

    @Post('termination-benefits')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async createTerminationBenefits(@Body() dto: CreateTerminationBenefitsDto, @Req() req: any) {
        return await this.payrollConfigurationService.createTerminationBenefits(dto, req.user.sub);
    }

    @Put('termination-benefits/:id')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async updateTerminationBenefits(@Param('id') id: string, @Body() dto: UpdateTerminationBenefitsDto, @Req() req: any) {
        return await this.payrollConfigurationService.updateTerminationBenefits(id, dto, req.user.sub);
    }

    @Get('termination-benefits')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async getAllTerminationBenefits(@Query('status') status?: ConfigStatus) {
        return await this.payrollConfigurationService.getAllTerminationBenefits(status);
    }

    @Get('termination-benefits/:id')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async getTerminationBenefitsById(@Param('id') id: string) {
        return await this.payrollConfigurationService.getTerminationBenefitsById(id);
    }

    @Delete('termination-benefits/:id')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async deleteTerminationBenefits(@Param('id') id: string, @Req() req: any) {
        return await this.payrollConfigurationService.deleteTerminationBenefits(id, req.user.sub);
    }

    @Post('termination-benefits/:id/approve')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async approveTerminationBenefits(@Param('id') id: string, @Req() req: any) {
        return await this.payrollConfigurationService.approveTerminationBenefits(id, req.user.sub);
    }

    @Post('termination-benefits/:id/reject')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async rejectTerminationBenefits(@Param('id') id: string, @Req() req: any) {
        return await this.payrollConfigurationService.rejectTerminationBenefits(id, req.user.sub);
    }

    // =====================================================
    // Tax Rules Endpoints
    // =====================================================

    @Post('tax-rules')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.LEGAL_POLICY_ADMIN, Role.SYSTEM_ADMIN)
    async createTaxRule(@Body() dto: CreateTaxRuleDto, @Req() req: any) {
        return await this.payrollConfigurationService.createTaxRule(dto, req.user.sub);
    }

    @Put('tax-rules/:id')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.LEGAL_POLICY_ADMIN, Role.SYSTEM_ADMIN)
    async updateTaxRule(@Param('id') id: string, @Body() dto: UpdateTaxRuleDto, @Req() req: any) {
        return await this.payrollConfigurationService.updateTaxRule(id, dto, req.user.sub);
    }

    @Get('tax-rules')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.LEGAL_POLICY_ADMIN, Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async getAllTaxRules(@Query('status') status?: ConfigStatus) {
        return await this.payrollConfigurationService.getAllTaxRules(status);
    }

    @Get('tax-rules/:id')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.LEGAL_POLICY_ADMIN, Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async getTaxRuleById(@Param('id') id: string) {
        return await this.payrollConfigurationService.getTaxRuleById(id);
    }

    @Delete('tax-rules/:id')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.LEGAL_POLICY_ADMIN, Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async deleteTaxRule(@Param('id') id: string, @Req() req: any) {
        return await this.payrollConfigurationService.deleteTaxRule(id, req.user.sub);
    }

    @Post('tax-rules/:id/approve')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async approveTaxRule(@Param('id') id: string, @Req() req: any) {
        return await this.payrollConfigurationService.approveTaxRule(id, req.user.sub);
    }

    @Post('tax-rules/:id/reject')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async rejectTaxRule(@Param('id') id: string, @Req() req: any) {
        return await this.payrollConfigurationService.rejectTaxRule(id, req.user.sub);
    }

    // =====================================================
    // Insurance Brackets Endpoints - HR Manager Approval
    // =====================================================

    @Post('insurance-brackets')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.HR_MANAGER, Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async createInsuranceBracket(@Body() dto: CreateInsuranceBracketDto, @Req() req: any) {
        return await this.payrollConfigurationService.createInsuranceBracket(dto, req.user.sub);
    }

    @Put('insurance-brackets/:id')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.HR_MANAGER, Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async updateInsuranceBracket(@Param('id') id: string, @Body() dto: UpdateInsuranceBracketDto, @Req() req: any) {
        return await this.payrollConfigurationService.updateInsuranceBracket(id, dto, req.user.sub);
    }

    @Get('insurance-brackets')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.HR_MANAGER, Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async getAllInsuranceBrackets(@Query('status') status?: ConfigStatus) {
        return await this.payrollConfigurationService.getAllInsuranceBrackets(status);
    }

    @Get('insurance-brackets/:id')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.HR_MANAGER, Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async getInsuranceBracketById(@Param('id') id: string) {
        return await this.payrollConfigurationService.getInsuranceBracketById(id);
    }

    @Delete('insurance-brackets/:id')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.HR_MANAGER, Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async deleteInsuranceBracket(@Param('id') id: string, @Req() req: any) {
        return await this.payrollConfigurationService.deleteInsuranceBracket(id, req.user.sub);
    }

    @Post('insurance-brackets/:id/approve')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.HR_MANAGER, Role.SYSTEM_ADMIN)
    async approveInsuranceBracket(@Param('id') id: string, @Req() req: any) {
        return await this.payrollConfigurationService.approveInsuranceBracket(id, req.user.sub);
    }

    @Post('insurance-brackets/:id/reject')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.HR_MANAGER, Role.SYSTEM_ADMIN)
    async rejectInsuranceBracket(@Param('id') id: string, @Req() req: any) {
        return await this.payrollConfigurationService.rejectInsuranceBracket(id, req.user.sub);
    }

    // =====================================================
    // Helper Endpoints - Get Approved Configurations
    // =====================================================

    @Get('approved/policies')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async getApprovedPolicies() {
        return await this.payrollConfigurationService.getApprovedPolicies();
    }

    @Get('approved/pay-grades')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async getApprovedPayGrades() {
        return await this.payrollConfigurationService.getApprovedPayGrades();
    }

    @Get('approved/allowances')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async getApprovedAllowances() {
        return await this.payrollConfigurationService.getApprovedAllowances();
    }

    @Get('approved/tax-rules')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async getApprovedTaxRules() {
        return await this.payrollConfigurationService.getApprovedTaxRules();
    }

    @Get('approved/insurance-brackets')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.HR_MANAGER, Role.PAYROLL_MANAGER, Role.SYSTEM_ADMIN)
    async getApprovedInsuranceBrackets() {
        return await this.payrollConfigurationService.getApprovedInsuranceBrackets();
    }

    // =====================================================
    // Company-Wide Settings Endpoints
    // =====================================================

    @Post('settings')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.SYSTEM_ADMIN)
    async createCompanySettings(@Body() dto: CreateCompanySettingsDto) {
        return await this.payrollConfigurationService.createCompanySettings(dto);
    }

    @Put('settings')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.SYSTEM_ADMIN)
    async updateCompanySettings(@Body() dto: UpdateCompanySettingsDto) {
        return await this.payrollConfigurationService.updateCompanySettings(dto);
    }

    @Get('settings')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.PAYROLL_SPECIALIST, Role.PAYROLL_MANAGER, Role.HR_MANAGER, Role.SYSTEM_ADMIN)
    async getCompanySettings() {
        return await this.payrollConfigurationService.getCompanySettings();
    }

    // =====================================================
    // Admin Backup Endpoints
    // =====================================================

    @Post('admin/backups/create')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.SYSTEM_ADMIN)
    async createBackup(@Req() req: any) {
        return await this.payrollConfigurationService.createBackup(req.user.sub);
    }

    @Get('admin/backups')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.SYSTEM_ADMIN)
    async getAllBackups() {
        return await this.payrollConfigurationService.getAllBackups();
    }

    @Get('admin/backups/:id/download')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.SYSTEM_ADMIN)
    async downloadBackup(@Param('id') id: string, @Res() res: any) {
        const { filePath, fileName } = await this.payrollConfigurationService.downloadBackup(id);
        return res.download(filePath, fileName);
    }

    @Post('admin/backups/:id/restore')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.SYSTEM_ADMIN)
    async restoreBackup(@Param('id') id: string, @Req() req: any) {
        await this.payrollConfigurationService.restoreBackup(id, req.user.sub);
        return { message: 'Backup restored successfully' };
    }

    @Delete('admin/backups/:id')
    @UseGuards(AuthGuard, authorizationGaurd)
    @Roles(Role.SYSTEM_ADMIN)
    async deleteBackup(@Param('id') id: string) {
        await this.payrollConfigurationService.deleteBackup(id);
        return { message: 'Backup deleted successfully' };
    }
}

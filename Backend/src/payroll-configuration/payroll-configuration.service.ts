import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);
import { payrollPolicies, payrollPoliciesDocument } from './models/payrollPolicies.schema';
import { payGrade, payGradeDocument } from './models/payGrades.schema';
import { payType, payTypeDocument } from './models/payType.schema';
import { allowance, allowanceDocument } from './models/allowance.schema';
import { signingBonus, signingBonusDocument } from './models/signingBonus.schema';
import { terminationAndResignationBenefits, terminationAndResignationBenefitsDocument } from './models/terminationAndResignationBenefits';
import { taxRules, taxRulesDocument } from './models/taxRules.schema';
import { insuranceBrackets, insuranceBracketsDocument } from './models/insuranceBrackets.schema';
import { CompanyWideSettings, CompanyWideSettingsDocument } from './models/CompanyWideSettings.schema';
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
import { Backup, BackupDocument } from './models/backup.schema';

@Injectable()
export class PayrollConfigurationService {
    constructor(
        @InjectModel(payrollPolicies.name) private payrollPoliciesModel: Model<payrollPoliciesDocument>,
        @InjectModel(payGrade.name) private payGradesModel: Model<payGradeDocument>,
        @InjectModel(payType.name) private payTypeModel: Model<payTypeDocument>,
        @InjectModel(allowance.name) private allowanceModel: Model<allowanceDocument>,
        @InjectModel(signingBonus.name) private signingBonusModel: Model<signingBonusDocument>,
        @InjectModel(terminationAndResignationBenefits.name) private terminationBenefitsModel: Model<terminationAndResignationBenefitsDocument>,
        @InjectModel(taxRules.name) private taxRulesModel: Model<taxRulesDocument>,
        @InjectModel(insuranceBrackets.name) private insuranceBracketsModel: Model<insuranceBracketsDocument>,
        @InjectModel(CompanyWideSettings.name) private companySettingsModel: Model<CompanyWideSettingsDocument>,
        @InjectModel(Backup.name) private backupModel: Model<BackupDocument>,
    ) {}

    // =====================================================
    // PHASE 1: Define Structure - Payroll Policies
    // =====================================================
    
    async createPayrollPolicy(dto: CreatePayrollPolicyDto, createdById: string): Promise<payrollPolicies> {
        const newPolicy = new this.payrollPoliciesModel({
            ...dto,
            status: ConfigStatus.DRAFT,
            createdBy: new Types.ObjectId(createdById),
        });
        return await newPolicy.save();
    }

    async updatePayrollPolicy(policyId: string, dto: UpdatePayrollPolicyDto, userId: string): Promise<payrollPolicies> {
        const policy = await this.payrollPoliciesModel.findById(policyId);
        if (!policy) {
            throw new NotFoundException('Payroll policy not found');
        }

        // Only allow updates if in DRAFT status
        if (policy.status !== ConfigStatus.DRAFT) {
            throw new BadRequestException('Can only update policies in DRAFT status');
        }

        // Verify the user is the creator or has appropriate role
        if (!policy.createdBy || policy.createdBy.toString() !== userId) {
            throw new ForbiddenException('You can only update policies you created');
        }

        Object.assign(policy, dto);
        return await policy.save();
    }

    async getAllPayrollPolicies(status?: ConfigStatus): Promise<payrollPolicies[]> {
        const filter = status ? { status } : {};
        return await this.payrollPoliciesModel.find(filter)
            .populate('createdBy', 'firstName lastName')
            .populate('approvedBy', 'firstName lastName')
            .exec();
    }

    async getPayrollPolicyById(policyId: string): Promise<payrollPolicies> {
        const policy = await this.payrollPoliciesModel.findById(policyId)
            .populate('createdBy', 'firstName lastName')
            .populate('approvedBy', 'firstName lastName')
            .exec();
        if (!policy) {
            throw new NotFoundException('Payroll policy not found');
        }
        return policy;
    }

    async deletePayrollPolicy(policyId: string, userId: string): Promise<void> {
        const policy = await this.payrollPoliciesModel.findById(policyId);
        if (!policy) {
            throw new NotFoundException('Payroll policy not found');
        }

        // Only allow deletion if in DRAFT status
        if (policy.status !== ConfigStatus.DRAFT) {
            throw new BadRequestException('Can only delete policies in DRAFT status');
        }

        // Verify the user is the creator
        if (!policy.createdBy || policy.createdBy.toString() !== userId) {
            throw new ForbiddenException('You can only delete policies you created');
        }

        await this.payrollPoliciesModel.findByIdAndDelete(policyId);
    }

    // =====================================================
    // PHASE 1: Define Structure - Pay Grades
    // =====================================================

    async createPayGrade(dto: CreatePayGradeDto, createdById: string): Promise<payGrade> {
        const newGrade = new this.payGradesModel({
            ...dto,
            status: ConfigStatus.DRAFT,
            createdBy: new Types.ObjectId(createdById),
        });
        return await newGrade.save();
    }

    async updatePayGrade(gradeId: string, dto: UpdatePayGradeDto, userId: string): Promise<payGrade> {
        const grade = await this.payGradesModel.findById(gradeId);
        if (!grade) {
            throw new NotFoundException('Pay grade not found');
        }

        if (grade.status !== ConfigStatus.DRAFT) {
            throw new BadRequestException('Can only update pay grades in DRAFT status');
        }

        if (!grade.createdBy || grade.createdBy.toString() !== userId) {
            throw new ForbiddenException('You can only update pay grades you created');
        }

        Object.assign(grade, dto);
        return await grade.save();
    }

    async getAllPayGrades(status?: ConfigStatus): Promise<payGrade[]> {
        const filter = status ? { status } : {};
        return await this.payGradesModel.find(filter)
            .populate('createdBy', 'firstName lastName')
            .populate('approvedBy', 'firstName lastName')
            .exec();
    }

    async getPayGradeById(gradeId: string): Promise<payGrade> {
        const grade = await this.payGradesModel.findById(gradeId)
            .populate('createdBy', 'firstName lastName')
            .populate('approvedBy', 'firstName lastName')
            .exec();
        if (!grade) {
            throw new NotFoundException('Pay grade not found');
        }
        return grade;
    }

    async deletePayGrade(gradeId: string, userId: string): Promise<void> {
        const grade = await this.payGradesModel.findById(gradeId);
        if (!grade) {
            throw new NotFoundException('Pay grade not found');
        }

        if (grade.status !== ConfigStatus.DRAFT) {
            throw new BadRequestException('Can only delete pay grades in DRAFT status');
        }

        if (!grade.createdBy || grade.createdBy.toString() !== userId) {
            throw new ForbiddenException('You can only delete pay grades you created');
        }

        await this.payGradesModel.findByIdAndDelete(gradeId);
    }

    // =====================================================
    // PHASE 1: Define Structure - Pay Types
    // =====================================================

    async createPayType(dto: CreatePayTypeDto, createdById: string): Promise<payType> {
        const newType = new this.payTypeModel({
            ...dto,
            status: ConfigStatus.DRAFT,
            createdBy: new Types.ObjectId(createdById),
        });
        return await newType.save();
    }

    async getAllPayTypes(status?: ConfigStatus): Promise<payType[]> {
        const filter = status ? { status } : {};
        return await this.payTypeModel.find(filter)
            .populate('createdBy', 'firstName lastName')
            .populate('approvedBy', 'firstName lastName')
            .exec();
    }

    async getPayTypeById(typeId: string): Promise<payType> {
        const type = await this.payTypeModel.findById(typeId)
            .populate('createdBy', 'firstName lastName')
            .populate('approvedBy', 'firstName lastName')
            .exec();
        if (!type) {
            throw new NotFoundException('Pay type not found');
        }
        return type;
    }

    async deletePayType(typeId: string, userId: string): Promise<void> {
        const type = await this.payTypeModel.findById(typeId);
        if (!type) {
            throw new NotFoundException('Pay type not found');
        }

        if (type.status !== ConfigStatus.DRAFT) {
            throw new BadRequestException('Can only delete pay types in DRAFT status');
        }

        if (!type.createdBy || type.createdBy.toString() !== userId) {
            throw new ForbiddenException('You can only delete pay types you created');
        }

        await this.payTypeModel.findByIdAndDelete(typeId);
    }

    // =====================================================
    // PHASE 1: Define Structure - Allowances
    // =====================================================

    async createAllowance(dto: CreateAllowanceDto, createdById: string): Promise<allowance> {
        const newAllowance = new this.allowanceModel({
            ...dto,
            status: ConfigStatus.DRAFT,
            createdBy: new Types.ObjectId(createdById),
        });
        return await newAllowance.save();
    }

    async updateAllowance(allowanceId: string, dto: UpdateAllowanceDto, userId: string): Promise<allowance> {
        const allowanceDoc = await this.allowanceModel.findById(allowanceId);
        if (!allowanceDoc) {
            throw new NotFoundException('Allowance not found');
        }

        if (allowanceDoc.status !== ConfigStatus.DRAFT) {
            throw new BadRequestException('Can only update allowances in DRAFT status');
        }

        if (!allowanceDoc.createdBy || allowanceDoc.createdBy.toString() !== userId) {
            throw new ForbiddenException('You can only update allowances you created');
        }

        Object.assign(allowanceDoc, dto);
        return await allowanceDoc.save();
    }

    async getAllAllowances(status?: ConfigStatus): Promise<allowance[]> {
        const filter = status ? { status } : {};
        return await this.allowanceModel.find(filter)
            .populate('createdBy', 'firstName lastName')
            .populate('approvedBy', 'firstName lastName')
            .exec();
    }

    async getAllowanceById(allowanceId: string): Promise<allowance> {
        const allowanceDoc = await this.allowanceModel.findById(allowanceId)
            .populate('createdBy', 'firstName lastName')
            .populate('approvedBy', 'firstName lastName')
            .exec();
        if (!allowanceDoc) {
            throw new NotFoundException('Allowance not found');
        }
        return allowanceDoc;
    }

    async deleteAllowance(allowanceId: string, userId: string): Promise<void> {
        const allowanceDoc = await this.allowanceModel.findById(allowanceId);
        if (!allowanceDoc) {
            throw new NotFoundException('Allowance not found');
        }

        if (allowanceDoc.status !== ConfigStatus.DRAFT) {
            throw new BadRequestException('Can only delete allowances in DRAFT status');
        }

        if (!allowanceDoc.createdBy || allowanceDoc.createdBy.toString() !== userId) {
            throw new ForbiddenException('You can only delete allowances you created');
        }

        await this.allowanceModel.findByIdAndDelete(allowanceId);
    }

    // =====================================================
    // PHASE 1: Define Structure - Signing Bonuses
    // =====================================================

    async createSigningBonus(dto: CreateSigningBonusDto, createdById: string): Promise<signingBonus> {
        const newBonus = new this.signingBonusModel({
            ...dto,
            status: ConfigStatus.DRAFT,
            createdBy: new Types.ObjectId(createdById),
        });
        return await newBonus.save();
    }

    async updateSigningBonus(bonusId: string, dto: UpdateSigningBonusDto, userId: string): Promise<signingBonus> {
        const bonus = await this.signingBonusModel.findById(bonusId);
        if (!bonus) {
            throw new NotFoundException('Signing bonus not found');
        }

        if (bonus.status !== ConfigStatus.DRAFT) {
            throw new BadRequestException('Can only update signing bonuses in DRAFT status');
        }

        if (!bonus.createdBy || bonus.createdBy.toString() !== userId) {
            throw new ForbiddenException('You can only update signing bonuses you created');
        }

        Object.assign(bonus, dto);
        return await bonus.save();
    }

    async getAllSigningBonuses(status?: ConfigStatus): Promise<signingBonus[]> {
        const filter = status ? { status } : {};
        return await this.signingBonusModel.find(filter)
            .populate('createdBy', 'firstName lastName')
            .populate('approvedBy', 'firstName lastName')
            .exec();
    }

    async getSigningBonusById(bonusId: string): Promise<signingBonus> {
        const bonus = await this.signingBonusModel.findById(bonusId)
            .populate('createdBy', 'firstName lastName')
            .populate('approvedBy', 'firstName lastName')
            .exec();
        if (!bonus) {
            throw new NotFoundException('Signing bonus not found');
        }
        return bonus;
    }

    async deleteSigningBonus(bonusId: string, userId: string): Promise<void> {
        const bonus = await this.signingBonusModel.findById(bonusId);
        if (!bonus) {
            throw new NotFoundException('Signing bonus not found');
        }

        if (bonus.status !== ConfigStatus.DRAFT) {
            throw new BadRequestException('Can only delete signing bonuses in DRAFT status');
        }

        if (!bonus.createdBy || bonus.createdBy.toString() !== userId) {
            throw new ForbiddenException('You can only delete signing bonuses you created');
        }

        await this.signingBonusModel.findByIdAndDelete(bonusId);
    }

    // =====================================================
    // PHASE 1: Define Structure - Termination Benefits
    // =====================================================

    async createTerminationBenefits(dto: CreateTerminationBenefitsDto, createdById: string): Promise<terminationAndResignationBenefits> {
        const newBenefits = new this.terminationBenefitsModel({
            ...dto,
            status: ConfigStatus.DRAFT,
            createdBy: new Types.ObjectId(createdById),
        });
        return await newBenefits.save();
    }

    async updateTerminationBenefits(benefitsId: string, dto: UpdateTerminationBenefitsDto, userId: string): Promise<terminationAndResignationBenefits> {
        const benefits = await this.terminationBenefitsModel.findById(benefitsId);
        if (!benefits) {
            throw new NotFoundException('Termination benefits not found');
        }

        if (benefits.status !== ConfigStatus.DRAFT) {
            throw new BadRequestException('Can only update termination benefits in DRAFT status');
        }

        if (!benefits.createdBy || benefits.createdBy.toString() !== userId) {
            throw new ForbiddenException('You can only update termination benefits you created');
        }

        Object.assign(benefits, dto);
        return await benefits.save();
    }

    async getAllTerminationBenefits(status?: ConfigStatus): Promise<terminationAndResignationBenefits[]> {
        const filter = status ? { status } : {};
        return await this.terminationBenefitsModel.find(filter)
            .populate('createdBy', 'firstName lastName')
            .populate('approvedBy', 'firstName lastName')
            .exec();
    }

    async getTerminationBenefitsById(benefitsId: string): Promise<terminationAndResignationBenefits> {
        const benefits = await this.terminationBenefitsModel.findById(benefitsId)
            .populate('createdBy', 'firstName lastName')
            .populate('approvedBy', 'firstName lastName')
            .exec();
        if (!benefits) {
            throw new NotFoundException('Termination benefits not found');
        }
        return benefits;
    }

    async deleteTerminationBenefits(benefitsId: string, userId: string): Promise<void> {
        const benefits = await this.terminationBenefitsModel.findById(benefitsId);
        if (!benefits) {
            throw new NotFoundException('Termination benefits not found');
        }

        if (benefits.status !== ConfigStatus.DRAFT) {
            throw new BadRequestException('Can only delete termination benefits in DRAFT status');
        }

        if (!benefits.createdBy || benefits.createdBy.toString() !== userId) {
            throw new ForbiddenException('You can only delete termination benefits you created');
        }

        await this.terminationBenefitsModel.findByIdAndDelete(benefitsId);
    }

    // =====================================================
    // PHASE 2: Embed Compliance - Tax Rules
    // =====================================================

    async createTaxRule(dto: CreateTaxRuleDto, createdById: string): Promise<taxRules> {
        const newRule = new this.taxRulesModel({
            ...dto,
            status: ConfigStatus.DRAFT,
            createdBy: new Types.ObjectId(createdById),
        });
        return await newRule.save();
    }

    async updateTaxRule(ruleId: string, dto: UpdateTaxRuleDto, userId: string): Promise<taxRules> {
        const rule = await this.taxRulesModel.findById(ruleId);
        if (!rule) {
            throw new NotFoundException('Tax rule not found');
        }

        if (rule.status !== ConfigStatus.DRAFT) {
            throw new BadRequestException('Can only update tax rules in DRAFT status');
        }

        if (!rule.createdBy || rule.createdBy.toString() !== userId) {
            throw new ForbiddenException('You can only update tax rules you created');
        }

        Object.assign(rule, dto);
        return await rule.save();
    }

    async getAllTaxRules(status?: ConfigStatus): Promise<taxRules[]> {
        const filter = status ? { status } : {};
        return await this.taxRulesModel.find(filter)
            .populate('createdBy', 'firstName lastName')
            .populate('approvedBy', 'firstName lastName')
            .exec();
    }

    async getTaxRuleById(ruleId: string): Promise<taxRules> {
        const rule = await this.taxRulesModel.findById(ruleId)
            .populate('createdBy', 'firstName lastName')
            .populate('approvedBy', 'firstName lastName')
            .exec();
        if (!rule) {
            throw new NotFoundException('Tax rule not found');
        }
        return rule;
    }

    async deleteTaxRule(ruleId: string, userId: string): Promise<void> {
        const rule = await this.taxRulesModel.findById(ruleId);
        if (!rule) {
            throw new NotFoundException('Tax rule not found');
        }

        if (rule.status !== ConfigStatus.DRAFT) {
            throw new BadRequestException('Can only delete tax rules in DRAFT status');
        }

        if (!rule.createdBy || rule.createdBy.toString() !== userId) {
            throw new ForbiddenException('You can only delete tax rules you created');
        }

        await this.taxRulesModel.findByIdAndDelete(ruleId);
    }

    // =====================================================
    // PHASE 2: Embed Compliance - Insurance Brackets
    // =====================================================

    async createInsuranceBracket(dto: CreateInsuranceBracketDto, createdById: string): Promise<insuranceBrackets> {
        const newBracket = new this.insuranceBracketsModel({
            ...dto,
            status: ConfigStatus.DRAFT,
            createdBy: new Types.ObjectId(createdById),
        });
        return await newBracket.save();
    }

    async updateInsuranceBracket(bracketId: string, dto: UpdateInsuranceBracketDto, userId: string): Promise<insuranceBrackets> {
        const bracket = await this.insuranceBracketsModel.findById(bracketId);
        if (!bracket) {
            throw new NotFoundException('Insurance bracket not found');
        }

        if (bracket.status !== ConfigStatus.DRAFT) {
            throw new BadRequestException('Can only update insurance brackets in DRAFT status');
        }

        if (!bracket.createdBy || bracket.createdBy.toString() !== userId) {
            throw new ForbiddenException('You can only update insurance brackets you created');
        }

        Object.assign(bracket, dto);
        return await bracket.save();
    }

    async getAllInsuranceBrackets(status?: ConfigStatus): Promise<insuranceBrackets[]> {
        const filter = status ? { status } : {};
        return await this.insuranceBracketsModel.find(filter)
            .populate('createdBy', 'firstName lastName')
            .populate('approvedBy', 'firstName lastName')
            .exec();
    }

    async getInsuranceBracketById(bracketId: string): Promise<insuranceBrackets> {
        const bracket = await this.insuranceBracketsModel.findById(bracketId)
            .populate('createdBy', 'firstName lastName')
            .populate('approvedBy', 'firstName lastName')
            .exec();
        if (!bracket) {
            throw new NotFoundException('Insurance bracket not found');
        }
        return bracket;
    }

    async deleteInsuranceBracket(bracketId: string, userId: string): Promise<void> {
        const bracket = await this.insuranceBracketsModel.findById(bracketId);
        if (!bracket) {
            throw new NotFoundException('Insurance bracket not found');
        }

        if (bracket.status !== ConfigStatus.DRAFT) {
            throw new BadRequestException('Can only delete insurance brackets in DRAFT status');
        }

        if (!bracket.createdBy || bracket.createdBy.toString() !== userId) {
            throw new ForbiddenException('You can only delete insurance brackets you created');
        }

        await this.insuranceBracketsModel.findByIdAndDelete(bracketId);
    }

    // =====================================================
    // PHASE 4: Approve Configuration - Payroll Manager
    // =====================================================

    async approvePayrollPolicy(policyId: string, approverId: string): Promise<payrollPolicies> {
        const policy = await this.payrollPoliciesModel.findById(policyId);
        if (!policy) {
            throw new NotFoundException('Payroll policy not found');
        }

        if (policy.status !== ConfigStatus.DRAFT) {
            throw new BadRequestException('Can only approve policies in DRAFT status');
        }

        policy.status = ConfigStatus.APPROVED;
        policy.approvedBy = new Types.ObjectId(approverId);
        policy.approvedAt = new Date();
        return await policy.save();
    }

    async rejectPayrollPolicy(policyId: string, approverId: string): Promise<payrollPolicies> {
        const policy = await this.payrollPoliciesModel.findById(policyId);
        if (!policy) {
            throw new NotFoundException('Payroll policy not found');
        }

        if (policy.status !== ConfigStatus.DRAFT) {
            throw new BadRequestException('Can only reject policies in DRAFT status');
        }

        policy.status = ConfigStatus.REJECTED;
        policy.approvedBy = new Types.ObjectId(approverId);
        policy.approvedAt = new Date();
        return await policy.save();
    }

    async approvePayGrade(gradeId: string, approverId: string): Promise<payGrade> {
        const grade = await this.payGradesModel.findById(gradeId);
        if (!grade) {
            throw new NotFoundException('Pay grade not found');
        }

        if (grade.status !== ConfigStatus.DRAFT) {
            throw new BadRequestException('Can only approve pay grades in DRAFT status');
        }

        grade.status = ConfigStatus.APPROVED;
        grade.approvedBy = new Types.ObjectId(approverId);
        grade.approvedAt = new Date();
        return await grade.save();
    }

    async rejectPayGrade(gradeId: string, approverId: string): Promise<payGrade> {
        const grade = await this.payGradesModel.findById(gradeId);
        if (!grade) {
            throw new NotFoundException('Pay grade not found');
        }

        if (grade.status !== ConfigStatus.DRAFT) {
            throw new BadRequestException('Can only reject pay grades in DRAFT status');
        }

        grade.status = ConfigStatus.REJECTED;
        grade.approvedBy = new Types.ObjectId(approverId);
        grade.approvedAt = new Date();
        return await grade.save();
    }

    async approvePayType(typeId: string, approverId: string): Promise<payType> {
        const type = await this.payTypeModel.findById(typeId);
        if (!type) {
            throw new NotFoundException('Pay type not found');
        }

        if (type.status !== ConfigStatus.DRAFT) {
            throw new BadRequestException('Can only approve pay types in DRAFT status');
        }

        type.status = ConfigStatus.APPROVED;
        type.approvedBy = new Types.ObjectId(approverId);
        type.approvedAt = new Date();
        return await type.save();
    }

    async rejectPayType(typeId: string, approverId: string): Promise<payType> {
        const type = await this.payTypeModel.findById(typeId);
        if (!type) {
            throw new NotFoundException('Pay type not found');
        }

        if (type.status !== ConfigStatus.DRAFT) {
            throw new BadRequestException('Can only reject pay types in DRAFT status');
        }

        type.status = ConfigStatus.REJECTED;
        type.approvedBy = new Types.ObjectId(approverId);
        type.approvedAt = new Date();
        return await type.save();
    }

    async approveAllowance(allowanceId: string, approverId: string): Promise<allowance> {
        const allowanceDoc = await this.allowanceModel.findById(allowanceId);
        if (!allowanceDoc) {
            throw new NotFoundException('Allowance not found');
        }

        if (allowanceDoc.status !== ConfigStatus.DRAFT) {
            throw new BadRequestException('Can only approve allowances in DRAFT status');
        }

        allowanceDoc.status = ConfigStatus.APPROVED;
        allowanceDoc.approvedBy = new Types.ObjectId(approverId);
        allowanceDoc.approvedAt = new Date();
        return await allowanceDoc.save();
    }

    async rejectAllowance(allowanceId: string, approverId: string): Promise<allowance> {
        const allowanceDoc = await this.allowanceModel.findById(allowanceId);
        if (!allowanceDoc) {
            throw new NotFoundException('Allowance not found');
        }

        if (allowanceDoc.status !== ConfigStatus.DRAFT) {
            throw new BadRequestException('Can only reject allowances in DRAFT status');
        }

        allowanceDoc.status = ConfigStatus.REJECTED;
        allowanceDoc.approvedBy = new Types.ObjectId(approverId);
        allowanceDoc.approvedAt = new Date();
        return await allowanceDoc.save();
    }

    async approveSigningBonus(bonusId: string, approverId: string): Promise<signingBonus> {
        const bonus = await this.signingBonusModel.findById(bonusId);
        if (!bonus) {
            throw new NotFoundException('Signing bonus not found');
        }

        if (bonus.status !== ConfigStatus.DRAFT) {
            throw new BadRequestException('Can only approve signing bonuses in DRAFT status');
        }

        bonus.status = ConfigStatus.APPROVED;
        bonus.approvedBy = new Types.ObjectId(approverId);
        bonus.approvedAt = new Date();
        return await bonus.save();
    }

    async rejectSigningBonus(bonusId: string, approverId: string): Promise<signingBonus> {
        const bonus = await this.signingBonusModel.findById(bonusId);
        if (!bonus) {
            throw new NotFoundException('Signing bonus not found');
        }

        if (bonus.status !== ConfigStatus.DRAFT) {
            throw new BadRequestException('Can only reject signing bonuses in DRAFT status');
        }

        bonus.status = ConfigStatus.REJECTED;
        bonus.approvedBy = new Types.ObjectId(approverId);
        bonus.approvedAt = new Date();
        return await bonus.save();
    }

    async approveTerminationBenefits(benefitsId: string, approverId: string): Promise<terminationAndResignationBenefits> {
        const benefits = await this.terminationBenefitsModel.findById(benefitsId);
        if (!benefits) {
            throw new NotFoundException('Termination benefits not found');
        }

        if (benefits.status !== ConfigStatus.DRAFT) {
            throw new BadRequestException('Can only approve termination benefits in DRAFT status');
        }

        benefits.status = ConfigStatus.APPROVED;
        benefits.approvedBy = new Types.ObjectId(approverId);
        benefits.approvedAt = new Date();
        return await benefits.save();
    }

    async rejectTerminationBenefits(benefitsId: string, approverId: string): Promise<terminationAndResignationBenefits> {
        const benefits = await this.terminationBenefitsModel.findById(benefitsId);
        if (!benefits) {
            throw new NotFoundException('Termination benefits not found');
        }

        if (benefits.status !== ConfigStatus.DRAFT) {
            throw new BadRequestException('Can only reject termination benefits in DRAFT status');
        }

        benefits.status = ConfigStatus.REJECTED;
        benefits.approvedBy = new Types.ObjectId(approverId);
        benefits.approvedAt = new Date();
        return await benefits.save();
    }

    async approveTaxRule(ruleId: string, approverId: string): Promise<taxRules> {
        const rule = await this.taxRulesModel.findById(ruleId);
        if (!rule) {
            throw new NotFoundException('Tax rule not found');
        }

        if (rule.status !== ConfigStatus.DRAFT) {
            throw new BadRequestException('Can only approve tax rules in DRAFT status');
        }

        rule.status = ConfigStatus.APPROVED;
        rule.approvedBy = new Types.ObjectId(approverId);
        rule.approvedAt = new Date();
        return await rule.save();
    }

    async rejectTaxRule(ruleId: string, approverId: string): Promise<taxRules> {
        const rule = await this.taxRulesModel.findById(ruleId);
        if (!rule) {
            throw new NotFoundException('Tax rule not found');
        }

        if (rule.status !== ConfigStatus.DRAFT) {
            throw new BadRequestException('Can only reject tax rules in DRAFT status');
        }

        rule.status = ConfigStatus.REJECTED;
        rule.approvedBy = new Types.ObjectId(approverId);
        rule.approvedAt = new Date();
        return await rule.save();
    }

    // =====================================================
    // PHASE 5: HR Oversight - Insurance Brackets
    // =====================================================

    async approveInsuranceBracket(bracketId: string, approverId: string): Promise<insuranceBrackets> {
        const bracket = await this.insuranceBracketsModel.findById(bracketId);
        if (!bracket) {
            throw new NotFoundException('Insurance bracket not found');
        }

        if (bracket.status !== ConfigStatus.DRAFT) {
            throw new BadRequestException('Can only approve insurance brackets in DRAFT status');
        }

        bracket.status = ConfigStatus.APPROVED;
        bracket.approvedBy = new Types.ObjectId(approverId);
        bracket.approvedAt = new Date();
        return await bracket.save();
    }

    async rejectInsuranceBracket(bracketId: string, approverId: string): Promise<insuranceBrackets> {
        const bracket = await this.insuranceBracketsModel.findById(bracketId);
        if (!bracket) {
            throw new NotFoundException('Insurance bracket not found');
        }

        if (bracket.status !== ConfigStatus.DRAFT) {
            throw new BadRequestException('Can only reject insurance brackets in DRAFT status');
        }

        bracket.status = ConfigStatus.REJECTED;
        bracket.approvedBy = new Types.ObjectId(approverId);
        bracket.approvedAt = new Date();
        return await bracket.save();
    }

    // =====================================================
    // Helper Methods - Get Approved Configurations
    // =====================================================

    async getApprovedPolicies(): Promise<payrollPolicies[]> {
        return await this.payrollPoliciesModel.find({ status: ConfigStatus.APPROVED }).exec();
    }

    async getApprovedPayGrades(): Promise<payGrade[]> {
        return await this.payGradesModel.find({ status: ConfigStatus.APPROVED }).exec();
    }

    async getApprovedAllowances(): Promise<allowance[]> {
        return await this.allowanceModel.find({ status: ConfigStatus.APPROVED }).exec();
    }

    async getApprovedTaxRules(): Promise<taxRules[]> {
        return await this.taxRulesModel.find({ status: ConfigStatus.APPROVED }).exec();
    }

    async getApprovedInsuranceBrackets(): Promise<insuranceBrackets[]> {
        return await this.insuranceBracketsModel.find({ status: ConfigStatus.APPROVED }).exec();
    }

    // =====================================================
    // Company-Wide Settings
    // =====================================================

    async createCompanySettings(dto: CreateCompanySettingsDto): Promise<CompanyWideSettings> {
        // Check if settings already exist (should only be one document)
        const existing = await this.companySettingsModel.findOne();
        if (existing) {
            throw new BadRequestException('Company settings already exist. Use update instead.');
        }

        // Convert payDate number to Date (day of month)
        const settings = new this.companySettingsModel({
            payDate: new Date(2000, 0, dto.payDate), // Store as date with day of month
            timeZone: dto.timeZone,
            currency: dto.currency,
        });
        return await settings.save();
    }

    async updateCompanySettings(dto: UpdateCompanySettingsDto): Promise<CompanyWideSettings> {
        // Find the existing settings (should only be one document)
        const settings = await this.companySettingsModel.findOne();
        if (!settings) {
            throw new NotFoundException('Company settings not found. Create them first.');
        }

        if (dto.payDate !== undefined) {
            settings.payDate = new Date(2000, 0, dto.payDate);
        }
        if (dto.timeZone !== undefined) {
            settings.timeZone = dto.timeZone;
        }
        if (dto.currency !== undefined) {
            settings.currency = dto.currency;
        }

        return await settings.save();
    }

    async getCompanySettings(): Promise<CompanyWideSettings | null> {
        return await this.companySettingsModel.findOne().exec();
    }

    // =====================================================
    // Backup Management
    // =====================================================

    async createBackup(userId: string): Promise<Backup> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `backup-${timestamp}.gz`;
        const backupDir = path.join(process.cwd(), 'backups');
        const filePath = path.join(backupDir, fileName);

        // Create backups directory if it doesn't exist
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        // Create backup record
        const backup = new this.backupModel({
            fileName,
            filePath,
            fileSize: 0,
            status: 'in_progress',
            type: 'manual',
            createdBy: new Types.ObjectId(userId),
        });
        await backup.save();

        try {
            // Get MongoDB connection URI from environment
            const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/onestaff';
            
            // Extract database name from URI
            const dbName = mongoUri.split('/').pop()?.split('?')[0] || 'onestaff';
            
            // Create mongodump command
            const command = `mongodump --uri="${mongoUri}" --archive="${filePath}" --gzip`;
            
            // Execute backup
            await execAsync(command);
            
            // Get file size
            const stats = fs.statSync(filePath);
            
            // Update backup record
            backup.fileSize = stats.size;
            backup.status = 'completed';
            await backup.save();
            
            return backup;
        } catch (error) {
            // Update backup record with error
            backup.status = 'failed';
            backup.errorMessage = error.message;
            await backup.save();
            throw new Error(`Backup failed: ${error.message}`);
        }
    }

    async getAllBackups(): Promise<Backup[]> {
        return await this.backupModel
            .find()
            .populate('createdBy', 'firstName lastName')
            .populate('restoredBy', 'firstName lastName')
            .sort({ createdAt: -1 })
            .exec();
    }

    async getBackupById(backupId: string): Promise<Backup> {
        const backup = await this.backupModel
            .findById(backupId)
            .populate('createdBy', 'firstName lastName')
            .populate('restoredBy', 'firstName lastName')
            .exec();
        
        if (!backup) {
            throw new NotFoundException('Backup not found');
        }
        
        return backup;
    }

    async downloadBackup(backupId: string): Promise<{ filePath: string; fileName: string }> {
        const backup = await this.getBackupById(backupId);
        
        if (backup.status !== 'completed') {
            throw new BadRequestException('Backup is not available for download');
        }
        
        if (!fs.existsSync(backup.filePath)) {
            throw new NotFoundException('Backup file not found on disk');
        }
        
        return {
            filePath: backup.filePath,
            fileName: backup.fileName,
        };
    }

    async restoreBackup(backupId: string, userId: string): Promise<void> {
        const backup = await this.getBackupById(backupId);
        
        if (backup.status !== 'completed') {
            throw new BadRequestException('Cannot restore incomplete backup');
        }
        
        if (!fs.existsSync(backup.filePath)) {
            throw new NotFoundException('Backup file not found on disk');
        }

        try {
            // Get MongoDB connection URI from environment
            const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/onestaff';
            
            // Create mongorestore command
            const command = `mongorestore --uri="${mongoUri}" --archive="${backup.filePath}" --gzip --drop`;
            
            // Execute restore
            await execAsync(command);
            
            // Update backup record
            await this.backupModel.findByIdAndUpdate(backupId, {
                restoredAt: new Date(),
                restoredBy: new Types.ObjectId(userId),
            });
        } catch (error) {
            throw new Error(`Restore failed: ${error.message}`);
        }
    }

    async deleteBackup(backupId: string): Promise<void> {
        const backup = await this.getBackupById(backupId);
        
        // Delete file from disk if it exists
        if (fs.existsSync(backup.filePath)) {
            fs.unlinkSync(backup.filePath);
        }
        
        // Delete backup record
        await this.backupModel.findByIdAndDelete(backupId);
    }
}

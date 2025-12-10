import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LeaveType, LeaveTypeDocument } from './models/leave-type.schema';
import { LeaveCategory, LeaveCategoryDocument } from './models/leave-category.schema';
import { LeavePolicy, LeavePolicyDocument } from './models/leave-policy.schema';
import { LeaveEntitlement, LeaveEntitlementDocument } from './models/leave-entitlement.schema';
import { LeaveRequest, LeaveRequestDocument } from './models/leave-request.schema';
import { LeaveAdjustment, LeaveAdjustmentDocument } from './models/leave-adjustment.schema';
import { Calendar, CalendarDocument } from './models/calendar.schema';
import { Attachment, AttachmentDocument } from './models/attachment.schema';
import { CreateLeaveTypeDto } from './dto/create-leave-type.dto';
import { CreateLeaveCategoryDto } from './dto/create-leave-category.dto';
import { CreateLeavePolicyDto } from './dto/create-leave-policy.dto';
import { UpdateLeavePolicyDto } from './dto/update-leave-policy.dto';
import { CreateLeaveEntitlementDto } from './dto/create-leave-entitlement.dto';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { UpdateLeaveRequestDto } from './dto/update-leave-request.dto';
import { ApproveLeaveDto } from './dto/approve-leave.dto';
import { RejectLeaveDto } from './dto/reject-leave.dto';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto';
import { CreateCalendarDto } from './dto/create-calendar.dto';
import { UploadAttachmentDto } from './dto/upload-attachment.dto';
import { FlagIrregularPatternDto } from './dto/flag-irregular-pattern.dto';
import { LeaveStatus } from './enums/leave-status.enum';
import { RoundingRule } from './enums/rounding-rule.enum';
import { EmployeeProfileService } from '../employee-profile/employee-profile.service';
import { NotificationService } from '../notifications/notification.service';

@Injectable()
export class LeavesService {
  constructor(
    @InjectModel(LeaveType.name) private leaveTypeModel: Model<LeaveTypeDocument>,
    @InjectModel(LeaveCategory.name) private leaveCategoryModel: Model<LeaveCategoryDocument>,
    @InjectModel(LeavePolicy.name) private leavePolicyModel: Model<LeavePolicyDocument>,
    @InjectModel(LeaveEntitlement.name) private leaveEntitlementModel: Model<LeaveEntitlementDocument>,
    @InjectModel(LeaveRequest.name) private leaveRequestModel: Model<LeaveRequestDocument>,
    @InjectModel(LeaveAdjustment.name) private leaveAdjustmentModel: Model<LeaveAdjustmentDocument>,
    @InjectModel(Calendar.name) private calendarModel: Model<CalendarDocument>,
    @InjectModel(Attachment.name) private attachmentModel: Model<AttachmentDocument>,
    private employeeProfileService: EmployeeProfileService,
    @Inject(forwardRef(() => NotificationService)) private notificationService: NotificationService,
  ) {}

  // ==================== PHASE 1: POLICY CONFIGURATION AND SETUP ====================

  /**
   * REQ-006: Create and manage leave types
   * BR 1, 2, 3, 4, 6
   */
  async createLeaveCategory(createDto: CreateLeaveCategoryDto): Promise<LeaveCategory> {
    const category = new this.leaveCategoryModel(createDto);
    return category.save();
  }

  /**
   * Get all leave categories
   */
  async getAllLeaveCategories(): Promise<LeaveCategory[]> {
    return this.leaveCategoryModel.find().exec();
  }

  /**
   * Update leave category
   */
  async updateLeaveCategory(id: string, updateDto: CreateLeaveCategoryDto): Promise<LeaveCategory> {
    const category = await this.leaveCategoryModel.findById(id).exec();
    if (!category) {
      throw new NotFoundException(`Leave category with ID ${id} not found`);
    }
    Object.assign(category, updateDto);
    return category.save();
  }

  /**
   * Delete leave category
   */
  async deleteLeaveCategory(id: string): Promise<{ deleted: boolean }> {
    // Check if any leave types use this category
    const typesUsingCategory = await this.leaveTypeModel.findOne({ categoryId: new Types.ObjectId(id) }).exec();
    if (typesUsingCategory) {
      throw new BadRequestException('Cannot delete category: it is being used by one or more leave types');
    }

    const result = await this.leaveCategoryModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Leave category with ID ${id} not found`);
    }
    return { deleted: true };
  }

  /**
   * REQ-006: Create and manage leave types
   * BR 1, 2, 3, 4, 6
   */
  async createLeaveType(createDto: CreateLeaveTypeDto): Promise<LeaveType> {
    const existingType = await this.leaveTypeModel.findOne({ code: createDto.code }).exec();
    if (existingType) {
      throw new BadRequestException(`Leave type with code ${createDto.code} already exists`);
    }

    const leaveType = new this.leaveTypeModel({
      ...createDto,
      categoryId: new Types.ObjectId(createDto.categoryId),
    });
    return leaveType.save();
  }

  /**
   * Get all leave types
   */
  async getAllLeaveTypes(): Promise<LeaveType[]> {
    return this.leaveTypeModel.find().populate('categoryId').exec();
  }

  /**
   * Get leave type by ID
   */
  async getLeaveTypeById(id: string): Promise<LeaveType> {
    const leaveType = await this.leaveTypeModel.findById(id).populate('categoryId').exec();
    if (!leaveType) {
      throw new NotFoundException(`Leave type with ID ${id} not found`);
    }
    return leaveType;
  }

  /**
   * Update leave type
   */
  async updateLeaveType(id: string, updateDto: CreateLeaveTypeDto): Promise<LeaveType> {
    const leaveType = await this.leaveTypeModel.findById(id).exec();
    if (!leaveType) {
      throw new NotFoundException(`Leave type with ID ${id} not found`);
    }

    // Check if code is being changed and if new code already exists
    if (updateDto.code && updateDto.code !== leaveType.code) {
      const existingType = await this.leaveTypeModel.findOne({ code: updateDto.code }).exec();
      if (existingType) {
        throw new BadRequestException(`Leave type with code ${updateDto.code} already exists`);
      }
    }

    Object.assign(leaveType, {
      ...updateDto,
      categoryId: updateDto.categoryId ? new Types.ObjectId(updateDto.categoryId) : leaveType.categoryId,
    });
    return leaveType.save();
  }

  /**
   * Delete leave type
   */
  async deleteLeaveType(id: string): Promise<{ deleted: boolean }> {
    // Check if any policies use this leave type
    const policiesUsingType = await this.leavePolicyModel.findOne({ leaveTypeId: new Types.ObjectId(id) }).exec();
    if (policiesUsingType) {
      throw new BadRequestException('Cannot delete leave type: it has associated policies');
    }

    // Check if any entitlements use this leave type
    const entitlementsUsingType = await this.leaveEntitlementModel.findOne({ leaveTypeId: new Types.ObjectId(id) }).exec();
    if (entitlementsUsingType) {
      throw new BadRequestException('Cannot delete leave type: it has associated entitlements');
    }

    const result = await this.leaveTypeModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Leave type with ID ${id} not found`);
    }
    return { deleted: true };
  }

  /**
   * REQ-003, REQ-009: Configure leave settings
   * BR 9, 10, 20, 42
   */
  async createLeavePolicy(createDto: CreateLeavePolicyDto): Promise<LeavePolicy> {
    const policy = new this.leavePolicyModel({
      ...createDto,
      leaveTypeId: new Types.ObjectId(createDto.leaveTypeId),
    });
    return policy.save();
  }

  /**
   * Update leave policy
   */
  async updateLeavePolicy(id: string, updateDto: UpdateLeavePolicyDto): Promise<LeavePolicy> {
    const policy = await this.leavePolicyModel.findById(id).exec();
    if (!policy) {
      throw new NotFoundException(`Leave policy with ID ${id} not found`);
    }

    // Convert leaveTypeId to ObjectId if provided
    const updateData = {
      ...updateDto,
      ...(updateDto.leaveTypeId && { leaveTypeId: new Types.ObjectId(updateDto.leaveTypeId) }),
    };

    Object.assign(policy, updateData);
    return policy.save();
  }

  /**
   * Delete leave policy
   */
  async deleteLeavePolicy(id: string): Promise<{ deleted: boolean }> {
    const result = await this.leavePolicyModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Leave policy with ID ${id} not found`);
    }
    return { deleted: true };
  }

  /**
   * Get all leave policies
   */
  async getAllLeavePolicies(): Promise<LeavePolicy[]> {
    return this.leavePolicyModel.find().populate('leaveTypeId').exec();
  }

  /**
   * Get leave policy by leave type
   */
  async getLeavePolicyByType(leaveTypeId: string): Promise<LeavePolicy> {
    const policy = await this.leavePolicyModel
      .findOne({ leaveTypeId: new Types.ObjectId(leaveTypeId) })
      .populate('leaveTypeId')
      .exec();

    if (!policy) {
      throw new NotFoundException(`Leave policy for leave type ${leaveTypeId} not found`);
    }
    return policy;
  }

  /**
   * REQ-008: Assign personalized entitlements
   * BR 7
   */
  async createLeaveEntitlement(createDto: CreateLeaveEntitlementDto): Promise<LeaveEntitlement> {
    const entitlement = new this.leaveEntitlementModel({
      employeeId: new Types.ObjectId(createDto.employeeId),
      leaveTypeId: new Types.ObjectId(createDto.leaveTypeId),
      yearlyEntitlement: createDto.yearlyEntitlement,
      carryForward: createDto.carryForward || 0,
      remaining: createDto.yearlyEntitlement + (createDto.carryForward || 0),
      nextResetDate: createDto.nextResetDate ? new Date(createDto.nextResetDate) : undefined,
    });
    return entitlement.save();
  }

  /**
   * Auto-assign leave entitlements to new hire after onboarding completion
   * Sets carryForward to 0 for all leave types
   * @param employeeId - The ID of the employee to assign entitlements to
   */
  async autoAssignLeaveEntitlementsForNewHire(employeeId: string): Promise<{
    success: boolean;
    assigned: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let assigned = 0;

    try {
      // Get all leave types
      const leaveTypes = await this.leaveTypeModel.find().exec();

      if (leaveTypes.length === 0) {
        errors.push('No leave types found in the system');
        return { success: false, assigned: 0, errors };
      }

      // Get employee profile to check if already has entitlements
      const existingEntitlements = await this.leaveEntitlementModel
        .find({ employeeId: new Types.ObjectId(employeeId) })
        .exec();

      for (const leaveType of leaveTypes) {
        try {
          // Check if entitlement already exists for this leave type
          const exists = existingEntitlements.some(
            (ent) => ent.leaveTypeId.toString() === leaveType._id.toString()
          );

          if (exists) {
            continue;
          }

          // Get the default yearly entitlement from policy (default to 0 days if not specified)
          let yearlyEntitlement = 0;
          
          // Try to find a matching policy for this leave type
          const policy = await this.leavePolicyModel
            .findOne({ leaveTypeId: leaveType._id })
            .exec();
          
          if (policy && policy.yearlyRate) {
            yearlyEntitlement = policy.yearlyRate;
          }

          // Create entitlement with carryForward set to 0
          const createDto: CreateLeaveEntitlementDto = {
            employeeId: employeeId,
            leaveTypeId: leaveType._id.toString(),
            yearlyEntitlement: yearlyEntitlement,
            carryForward: 0, // Always 0 for new hires
            nextResetDate: new Date(new Date().getFullYear() + 1, 0, 1).toISOString(), // Next January 1st
          };

          await this.createLeaveEntitlement(createDto);
          assigned++;
        } catch (error) {
          errors.push(`Failed to assign ${leaveType.name}: ${error.message}`);
        }
      }

      return {
        success: assigned > 0,
        assigned,
        errors,
      };
    } catch (error) {
      errors.push(`Critical error in auto-assignment: ${error.message}`);
      return {
        success: false,
        assigned: 0,
        errors,
      };
    }
  }

  /**
   * Bulk assign entitlements to employees based on configured policies
   * @param policyId - Optional: Assign only for specific policy
   * @param positionId - Optional: Filter employees by position
   * @param contractType - Optional: Filter employees by contract type
   */
  async bulkAssignEntitlements(
    policyId?: string,
    positionId?: string,
    contractType?: string,
  ): Promise<{ created: number; skipped: number; errors: string[] }> {
    // Get policies - either specific one or all
    let policies;
    if (policyId) {
      const policy = await this.leavePolicyModel.findById(policyId).populate('leaveTypeId').exec();
      policies = policy ? [policy] : [];
    } else {
      policies = await this.leavePolicyModel.find().populate('leaveTypeId').exec();
    }

    const allEmployees = await this.employeeProfileService.getAllEmployeeProfiles();
    
    // Filter employees if position or contract type specified
    let employees = allEmployees;
    if (positionId) {
      employees = employees.filter((emp: any) => {
        const primaryPos = emp.primaryPositionId;
        const empPositionId = primaryPos?._id?.toString() || primaryPos?.toString() || '';
        return empPositionId === positionId;
      });
    }
    if (contractType) {
      employees = employees.filter((emp: any) => emp.contractType === contractType);
    }
    
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const policy of policies) {
      const leaveTypeId = (policy.leaveTypeId as any)._id || policy.leaveTypeId;
      const yearlyEntitlement = policy.yearlyRate || 0;

      for (const employee of employees) {
        const employeeId = (employee as any)._id;
        try {
          // Check eligibility based on policy rules (only if not filtering manually)
          const eligibility = policy.eligibility || {};
          
          // Check position eligibility - use primaryPositionId from employee profile
          // Skip this check if we're already filtering by position
          if (!positionId && eligibility.positionsAllowed && eligibility.positionsAllowed.length > 0) {
            const primaryPos = (employee as any).primaryPositionId;
            const employeePositionId = primaryPos?._id?.toString() || primaryPos?.toString() || '';
            if (!eligibility.positionsAllowed.includes(employeePositionId)) {
              skipped++;
              continue;
            }
          }

          // Check contract type eligibility
          // Skip this check if we're already filtering by contract type
          if (!contractType && eligibility.contractTypesAllowed && eligibility.contractTypesAllowed.length > 0) {
            const employeeContractType = (employee as any).contractType || '';
            if (!eligibility.contractTypesAllowed.includes(employeeContractType)) {
              skipped++;
              continue;
            }
          }

          // Check if entitlement already exists
          const existingEntitlement = await this.leaveEntitlementModel.findOne({
            employeeId: new Types.ObjectId(employeeId.toString()),
            leaveTypeId: new Types.ObjectId(leaveTypeId.toString()),
          }).exec();

          if (existingEntitlement) {
            // Update existing entitlement
            existingEntitlement.yearlyEntitlement = yearlyEntitlement;
            existingEntitlement.remaining = yearlyEntitlement + (existingEntitlement.carryForward || 0) - (existingEntitlement.taken || 0);
            await existingEntitlement.save();
            skipped++;
          } else {
            // Create new entitlement
            const entitlement = new this.leaveEntitlementModel({
              employeeId: new Types.ObjectId(employeeId.toString()),
              leaveTypeId: new Types.ObjectId(leaveTypeId.toString()),
              yearlyEntitlement: yearlyEntitlement,
              carryForward: 0,
              remaining: yearlyEntitlement,
            });
            await entitlement.save();
            created++;
          }
        } catch (err: any) {
          errors.push(`Failed to assign entitlement to employee ${employeeId}: ${err.message}`);
        }
      }
    }

    return { created, skipped, errors };
  }

  /**
   * REQ-010: Configure calendar & blocked days
   * BR 33, 55
   * Creates or updates a calendar for a given year
   */
  async createCalendar(createDto: CreateCalendarDto): Promise<Calendar> {
    const existingCalendar = await this.calendarModel.findOne({ year: createDto.year }).exec();
    
    // Convert blocked periods with string dates to Date objects
    const blockedPeriods = (createDto.blockedPeriods || []).map(bp => ({
      from: new Date(bp.from),
      to: new Date(bp.to),
      reason: bp.reason,
    }));

    // Convert holiday IDs to ObjectIds
    const holidayIds = (createDto.holidays || []).map(id => new Types.ObjectId(id));

    if (existingCalendar) {
      // Update existing calendar
      existingCalendar.holidays = holidayIds;
      existingCalendar.blockedPeriods = blockedPeriods;
      return existingCalendar.save();
    }

    // Create new calendar
    const calendar = new this.calendarModel({
      year: createDto.year,
      holidays: holidayIds,
      blockedPeriods: blockedPeriods,
    });
    return calendar.save();
  }

  /**
   * Get calendar by year
   */
  async getCalendarByYear(year: number): Promise<Calendar> {
    const calendar = await this.calendarModel.findOne({ year }).populate('holidays').exec();
    if (!calendar) {
      throw new NotFoundException(`Calendar for year ${year} not found`);
    }
    return calendar;
  }

  // ==================== PHASE 2: LEAVE REQUEST MANAGEMENT & WORKFLOW ====================

  // Static HR Manager Position ID
  private readonly HR_MANAGER_POSITION_ID = '6926fa8ecec472d756f0646a';

  /**
   * REQ-015: Submit new leave request
   * BR 25, 29, 31
   */
  async submitLeaveRequest(createDto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    const employeeId = new Types.ObjectId(createDto.employeeId);
    const leaveTypeId = new Types.ObjectId(createDto.leaveTypeId);

    // Validate leave type exists
    const leaveType = await this.leaveTypeModel.findById(leaveTypeId).exec();
    if (!leaveType) {
      throw new NotFoundException('Leave type not found');
    }

    // Get employee's entitlement
    let entitlement = await this.leaveEntitlementModel
      .findOne({ employeeId, leaveTypeId })
      .exec();

    // Auto-create entitlement if not found and policy exists
    if (!entitlement) {
      const policy = await this.leavePolicyModel.findOne({ leaveTypeId }).exec();
      if (policy) {
        // Create entitlement based on policy
        const yearlyEntitlement = policy.yearlyRate || 0;
        entitlement = new this.leaveEntitlementModel({
          employeeId,
          leaveTypeId,
          yearlyEntitlement,
          carryForward: 0,
          remaining: yearlyEntitlement,
          pending: 0,
          used: 0,
        });
        await entitlement.save();
      } else {
        // No policy exists - create with zero entitlement for non-deductible types
        if (!leaveType.deductible) {
          entitlement = new this.leaveEntitlementModel({
            employeeId,
            leaveTypeId,
            yearlyEntitlement: 0,
            carryForward: 0,
            remaining: 999, // Unlimited for non-deductible leave
            pending: 0,
            used: 0,
          });
          await entitlement.save();
        } else {
          throw new NotFoundException(
            'Leave entitlement not found for this employee and leave type. Please contact HR to set up your leave entitlement.',
          );
        }
      }
    }

    // BR 31: Allow leaves to exceed balance
    // If paid leave exceeds balance, extra days will be treated as unpaid during payroll
    // No balance check needed here

    // BR 31: Check for overlapping leaves
    const overlappingLeaves = await this.leaveRequestModel
      .find({
        employeeId,
        status: { $in: [LeaveStatus.APPROVED, LeaveStatus.PENDING] },
        $or: [
          {
            'dates.from': { $lte: new Date(createDto.dateTo) },
            'dates.to': { $gte: new Date(createDto.dateFrom) },
          },
        ],
      })
      .exec();

    if (overlappingLeaves.length > 0) {
      throw new BadRequestException('Leave request overlaps with existing approved or pending leave');
    }

    // Create leave request
    // The approvalFlow uses simple role names. The system determines who can approve:
    // - Manager: The employee who holds the supervisorPositionId of the requesting employee
    // - HR: The employee who holds the HR Manager Position (6926fa8ecec472d756f0646a)
    const leaveRequest = new this.leaveRequestModel({
      employeeId,
      leaveTypeId,
      dates: {
        from: new Date(createDto.dateFrom),
        to: new Date(createDto.dateTo),
      },
      durationDays: createDto.durationDays,
      justification: createDto.justification,
      attachmentId: createDto.attachmentId ? new Types.ObjectId(createDto.attachmentId) : undefined,
      status: LeaveStatus.PENDING,
      approvalFlow: [
        {
          role: 'Manager',
          status: 'pending',
        },
        {
          role: 'HR',
          status: 'pending',
        },
      ],
    });

    const saved = await leaveRequest.save();

    // BR 32: Update pending balance (allow negative balance)
    entitlement.pending += createDto.durationDays;
    entitlement.remaining -= createDto.durationDays; // Can go negative
    await entitlement.save();

    return saved;
  }

  /**
   * REQ-017: Modify pending request
   */
  async updateLeaveRequest(
    requestId: string,
    updateDto: UpdateLeaveRequestDto,
  ): Promise<LeaveRequest> {
    const leaveRequest = await this.leaveRequestModel.findById(requestId).exec();
    if (!leaveRequest) {
      throw new NotFoundException('Leave request not found');
    }

    if (leaveRequest.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Only pending leave requests can be modified');
    }

    // If dates are changing, recalculate pending balance
    const oldDuration = leaveRequest.durationDays;
    const newDuration = updateDto.durationDays || oldDuration;

    if (updateDto.dateFrom) leaveRequest.dates.from = new Date(updateDto.dateFrom);
    if (updateDto.dateTo) leaveRequest.dates.to = new Date(updateDto.dateTo);
    if (updateDto.durationDays) leaveRequest.durationDays = updateDto.durationDays;
    if (updateDto.justification) leaveRequest.justification = updateDto.justification;
    if (updateDto.attachmentId) {
      leaveRequest.attachmentId = new Types.ObjectId(updateDto.attachmentId);
    }

    const saved = await leaveRequest.save();

    // Adjust entitlement if duration changed
    if (oldDuration !== newDuration) {
      const entitlement = await this.leaveEntitlementModel
        .findOne({
          employeeId: leaveRequest.employeeId,
          leaveTypeId: leaveRequest.leaveTypeId,
        })
        .exec();

      if (entitlement) {
        entitlement.pending += newDuration - oldDuration;
        entitlement.remaining -= newDuration - oldDuration;
        await entitlement.save();
      }
    }

    return saved;
  }

  /**
   * REQ-018: Cancel pending request
   * BR 18
   */
  async cancelLeaveRequest(requestId: string): Promise<LeaveRequest> {
    const leaveRequest = await this.leaveRequestModel.findById(requestId).exec();
    if (!leaveRequest) {
      throw new NotFoundException('Leave request not found');
    }

    if (leaveRequest.status === LeaveStatus.CANCELLED) {
      throw new BadRequestException('Leave request is already cancelled');
    }

    // Preserve the previous status before changing to CANCELLED so we can
    // correctly revert balances based on what the status was at the time of cancellation.
    const previousStatus = leaveRequest.status;

    leaveRequest.status = LeaveStatus.CANCELLED;
    const saved = await leaveRequest.save();

    // BR 18: Return days to balance
    const entitlement = await this.leaveEntitlementModel
      .findOne({
        employeeId: leaveRequest.employeeId,
        leaveTypeId: leaveRequest.leaveTypeId,
      })
      .exec();

    if (entitlement) {
      if (previousStatus === LeaveStatus.PENDING) {
        entitlement.pending -= leaveRequest.durationDays;
      } else if (previousStatus === LeaveStatus.APPROVED) {
        entitlement.taken -= leaveRequest.durationDays;
      }
      entitlement.remaining += leaveRequest.durationDays;
      await entitlement.save();
    }

    return saved;
  }

  /**
   * REQ-021: Manager approval
   * BR 25 - Manager approves only their own step (first step - index 0)
   */
  async approveLeaveRequest(requestId: string, approvalDto: ApproveLeaveDto): Promise<LeaveRequest> {
    const leaveRequest = await this.leaveRequestModel.findById(requestId).populate('employeeId').exec();
    if (!leaveRequest) {
      throw new NotFoundException('Leave request not found');
    }

    // Authorization: Check if approver is in the same department as the employee
    const approverProfile = await this.employeeProfileService.getEmployeeProfileById(approvalDto.approverId);
    const employeeDeptId = (leaveRequest.employeeId as any)?.primaryDepartmentId?.toString();
    const approverDeptId = (approverProfile as any)?.primaryDepartmentId?._id?.toString() || 
                           (approverProfile as any)?.primaryDepartmentId?.toString();
    
    if (employeeDeptId && approverDeptId && employeeDeptId !== approverDeptId) {
      throw new BadRequestException('You can only approve leave requests from employees in your department');
    }

    // Manager can only approve the FIRST step (index 0) - their own manager approval
    const managerStep = leaveRequest.approvalFlow[0];
    
    if (!managerStep) {
      throw new BadRequestException('No approval step found for this leave request');
    }

    if (managerStep.status !== 'pending') {
      throw new BadRequestException('Manager approval has already been processed');
    }

    // Update only the manager's approval step (first step)
    managerStep.status = 'approved';
    managerStep.decidedBy = new Types.ObjectId(approvalDto.approverId);
    managerStep.decidedAt = new Date();

    // Check if all approvals are complete (both manager and HR)
    const allApproved = leaveRequest.approvalFlow.every(step => step.status === 'approved');

    if (allApproved) {
      leaveRequest.status = LeaveStatus.APPROVED;

      // BR 32: Update balance - move from pending to taken
      const entitlement = await this.leaveEntitlementModel
        .findOne({
          employeeId: leaveRequest.employeeId,
          leaveTypeId: leaveRequest.leaveTypeId,
        })
        .exec();

      if (entitlement) {
        entitlement.pending -= leaveRequest.durationDays;
        entitlement.taken += leaveRequest.durationDays;
        await entitlement.save();
      }
    }

    return leaveRequest.save();
  }

  /**
   * REQ-022: Manager rejection
   * BR 25 - Manager rejects only their own step (first step - index 0)
   */
  async rejectLeaveRequest(requestId: string, rejectionDto: RejectLeaveDto): Promise<LeaveRequest> {
    const leaveRequest = await this.leaveRequestModel.findById(requestId).populate('employeeId').exec();
    if (!leaveRequest) {
      throw new NotFoundException('Leave request not found');
    }

    // Authorization: Check if approver is in the same department as the employee
    const approverProfile = await this.employeeProfileService.getEmployeeProfileById(rejectionDto.approverId);
    const employeeDeptId = (leaveRequest.employeeId as any)?.primaryDepartmentId?.toString();
    const approverDeptId = (approverProfile as any)?.primaryDepartmentId?._id?.toString() || 
                           (approverProfile as any)?.primaryDepartmentId?.toString();
    
    if (employeeDeptId && approverDeptId && employeeDeptId !== approverDeptId) {
      throw new BadRequestException('You can only reject leave requests from employees in your department');
    }

    // Manager can only reject the FIRST step (index 0) - their own manager approval
    const managerStep = leaveRequest.approvalFlow[0];
    
    if (!managerStep) {
      throw new BadRequestException('No approval step found for this leave request');
    }

    if (managerStep.status !== 'pending') {
      throw new BadRequestException('Manager approval has already been processed');
    }

    // Update only the manager's step (first step)
    managerStep.status = 'rejected';
    managerStep.decidedBy = new Types.ObjectId(rejectionDto.approverId);
    managerStep.decidedAt = new Date();

    // Any rejection immediately rejects the entire request
    leaveRequest.status = LeaveStatus.REJECTED;

    const saved = await leaveRequest.save();

    // Return days from pending to remaining
    const entitlement = await this.leaveEntitlementModel
      .findOne({
        employeeId: leaveRequest.employeeId,
        leaveTypeId: leaveRequest.leaveTypeId,
      })
      .exec();

    if (entitlement) {
      entitlement.pending -= leaveRequest.durationDays;
      entitlement.remaining += leaveRequest.durationDays;
      await entitlement.save();
    }

    return saved;
  }

  /**
   * REQ-020: Get leave requests by department for manager review
   * Filters requests where the employee belongs to the specified department
   */
  async getLeaveRequestsByDepartment(departmentId: string, status?: LeaveStatus): Promise<LeaveRequest[]> {
    // Get all employees and filter by department
    const allEmployees = await this.employeeProfileService.getAllEmployeeProfiles();
    const employeesInDept = allEmployees.filter(emp => {
      const empDeptId = (emp as any).primaryDepartmentId?._id?.toString() || (emp as any).primaryDepartmentId?.toString();
      return empDeptId === departmentId;
    });
    const employeeIds = employeesInDept.map(emp => (emp as any)._id);

    if (employeeIds.length === 0) {
      return [];
    }

    const query: any = {
      employeeId: { $in: employeeIds },
    };

    // Default to pending status if not specified
    if (status) {
      query.status = status;
    } else {
      query.status = LeaveStatus.PENDING;
    }

    return this.leaveRequestModel
      .find(query)
      .populate('employeeId')
      .populate('leaveTypeId')
      .populate('attachmentId')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Get leave requests with filters
   */
  async getLeaveRequests(filters?: {
    employeeId?: string;
    leaveTypeId?: string;
    status?: LeaveStatus;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<LeaveRequest[]> {
    const query: any = {};

    if (filters?.employeeId) query.employeeId = new Types.ObjectId(filters.employeeId);
    if (filters?.leaveTypeId) query.leaveTypeId = new Types.ObjectId(filters.leaveTypeId);
    if (filters?.status) query.status = filters.status;
    if (filters?.dateFrom || filters?.dateTo) {
      query['dates.from'] = {};
      if (filters.dateFrom) query['dates.from'].$gte = new Date(filters.dateFrom);
      if (filters.dateTo) query['dates.from'].$lte = new Date(filters.dateTo);
    }

    return this.leaveRequestModel
      .find(query)
      .populate('employeeId')
      .populate('leaveTypeId')
      .populate('attachmentId')
      .exec();
  }

  /**
   * Get leave request by ID
   */
  async getLeaveRequestById(id: string): Promise<LeaveRequest> {
    const request = await this.leaveRequestModel
      .findById(id)
      .populate('employeeId')
      .populate('leaveTypeId')
      .populate('attachmentId')
      .exec();

    if (!request) {
      throw new NotFoundException('Leave request not found');
    }
    return request;
  }

  // ==================== PHASE 3: TRACKING, MONITORING, AND AUDITING ====================

  /**
   * REQ-031: Employee view current balance
   * BR 14, 32, 20
   */
  async getEmployeeLeaveBalance(employeeId: string, leaveTypeId?: string): Promise<LeaveEntitlement[]> {
    const query: any = { employeeId: new Types.ObjectId(employeeId) };
    if (leaveTypeId) {
      query.leaveTypeId = new Types.ObjectId(leaveTypeId);
    }

    const entitlements = await this.leaveEntitlementModel
      .find(query)
      .populate('leaveTypeId')
      .exec();

    // Apply rounding for display
    return entitlements.map(ent => {
      const policy = ent.leaveTypeId as any;
      if (policy?.roundingRule) {
        ent.accruedRounded = this.applyRounding(ent.accruedActual, policy.roundingRule);
      }
      return ent;
    });
  }

  /**
   * REQ-032: Employee view past history
   */
  async getEmployeeLeaveHistory(
    employeeId: string,
    filters?: { leaveTypeId?: string; status?: LeaveStatus; dateFrom?: string; dateTo?: string },
  ): Promise<LeaveRequest[]> {
    return this.getLeaveRequests({ employeeId, ...filters });
  }

  /**
   * REQ-034: Manager view team balances
   * BR 46
   */
  async getTeamLeaveBalances(teamMemberIds: string[]): Promise<LeaveEntitlement[]> {
    const memberObjectIds = teamMemberIds.map(id => new Types.ObjectId(id));
    return this.leaveEntitlementModel
      .find({ employeeId: { $in: memberObjectIds } })
      .populate('employeeId')
      .populate('leaveTypeId')
      .exec();
  }

  /**
   * REQ-039: Flag irregular patterns
   */
  async flagIrregularPattern(flagDto: FlagIrregularPatternDto): Promise<LeaveRequest> {
    const request = await this.leaveRequestModel.findById(flagDto.requestId).exec();
    if (!request) {
      throw new NotFoundException('Leave request not found');
    }

    request.irregularPatternFlag = flagDto.irregularPatternFlag;
    return request.save();
  }

  /**
   * REQ-013: Manual balance adjustment
   * BR 12, 16, 17
   */
  async createManualAdjustment(createDto: CreateAdjustmentDto): Promise<LeaveAdjustment> {
    const adjustment = new this.leaveAdjustmentModel({
      employeeId: new Types.ObjectId(createDto.employeeId),
      leaveTypeId: new Types.ObjectId(createDto.leaveTypeId),
      adjustmentType: createDto.adjustmentType,
      amount: createDto.amount,
      reason: createDto.reason,
      hrUserId: new Types.ObjectId(createDto.hrUserId),
    });

    const saved = await adjustment.save();

    // Update entitlement balance
    const entitlement = await this.leaveEntitlementModel
      .findOne({
        employeeId: new Types.ObjectId(createDto.employeeId),
        leaveTypeId: new Types.ObjectId(createDto.leaveTypeId),
      })
      .exec();

    if (entitlement) {
      if (createDto.adjustmentType === 'add') {
        entitlement.yearlyEntitlement += createDto.amount;
        entitlement.remaining += createDto.amount;
      } else if (createDto.adjustmentType === 'deduct') {
        entitlement.yearlyEntitlement -= createDto.amount;
        entitlement.remaining -= createDto.amount;
      }
      await entitlement.save();
    }

    return saved;
  }

  /**
   * Get adjustment history
   */
  async getAdjustmentHistory(employeeId: string): Promise<LeaveAdjustment[]> {
    return this.leaveAdjustmentModel
      .find({ employeeId: new Types.ObjectId(employeeId) })
      .populate('leaveTypeId')
      .populate('hrUserId')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * REQ-040: Automatic leave accrual
   * BR 10
   */
  async processMonthlyAccrual(employeeId: string, leaveTypeId: string): Promise<LeaveEntitlement> {
    const entitlement = await this.leaveEntitlementModel
      .findOne({
        employeeId: new Types.ObjectId(employeeId),
        leaveTypeId: new Types.ObjectId(leaveTypeId),
      })
      .exec();

    if (!entitlement) {
      throw new NotFoundException('Leave entitlement not found');
    }

    const policy = await this.leavePolicyModel
      .findOne({ leaveTypeId: new Types.ObjectId(leaveTypeId) })
      .exec();

    if (!policy) {
      throw new NotFoundException('Leave policy not found');
    }

    // Calculate accrual based on policy
    let accrualAmount = 0;
    if (policy.accrualMethod === 'monthly') {
      accrualAmount = policy.monthlyRate;
    } else if (policy.accrualMethod === 'yearly') {
      accrualAmount = policy.yearlyRate / 12; // Monthly portion
    }

    entitlement.accruedActual += accrualAmount;
    entitlement.accruedRounded = this.applyRounding(entitlement.accruedActual, policy.roundingRule);
    entitlement.remaining += accrualAmount;
    entitlement.lastAccrualDate = new Date();

    return entitlement.save();
  }

  /**
   * REQ-041: Automatic carry-forward processing
   * BR 9, 42
   */
  async processYearEndCarryForward(employeeId: string, leaveTypeId: string): Promise<LeaveEntitlement> {
    const entitlement = await this.leaveEntitlementModel
      .findOne({
        employeeId: new Types.ObjectId(employeeId),
        leaveTypeId: new Types.ObjectId(leaveTypeId),
      })
      .exec();

    if (!entitlement) {
      throw new NotFoundException('Leave entitlement not found');
    }

    const policy = await this.leavePolicyModel
      .findOne({ leaveTypeId: new Types.ObjectId(leaveTypeId) })
      .exec();

    if (!policy) {
      throw new NotFoundException('Leave policy not found');
    }

    if (policy.carryForwardAllowed) {
      const carryAmount = Math.min(entitlement.remaining, policy.maxCarryForward);
      entitlement.carryForward = carryAmount;
      entitlement.remaining = carryAmount;
      entitlement.taken = 0;
      entitlement.pending = 0;
      entitlement.accruedActual = 0;
      entitlement.accruedRounded = 0;

      // Set next reset date
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      entitlement.nextResetDate = nextYear;
    } else {
      // No carry forward - reset to zero
      entitlement.remaining = 0;
      entitlement.carryForward = 0;
      entitlement.taken = 0;
      entitlement.pending = 0;
      entitlement.accruedActual = 0;
      entitlement.accruedRounded = 0;
    }

    return entitlement.save();
  }

  /**
   * REQ-016: Upload attachment
   * BR 54
   */
  async uploadAttachment(uploadDto: UploadAttachmentDto): Promise<Attachment> {
    const attachment = new this.attachmentModel(uploadDto);
    return attachment.save();
  }

  /**
   * REQ-016: Upload attachment with GridFS file
   */
  async uploadAttachmentWithGridFS(data: {
    originalName: string;
    fileType: string;
    size: number;
    gridFsFileId: string;
  }): Promise<Attachment> {
    const attachment = new this.attachmentModel({
      originalName: data.originalName,
      fileType: data.fileType,
      size: data.size,
      gridFsFileId: new Types.ObjectId(data.gridFsFileId),
    });
    return attachment.save();
  }

  /**
   * Get attachment by ID
   */
  async getAttachmentById(id: string): Promise<Attachment> {
    const attachment = await this.attachmentModel.findById(id).exec();
    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }
    return attachment;
  }

  // ==================== PHASE 4: HR FINALIZATION AND ADVANCED OPERATIONS ====================

  /**
   * REQ-025: HR Finalize Approved Requests
   * HR Admin reviews for compliance with HR leaves' guidelines and finalizes
   * This updates the HR step (index 1) and triggers balance update + notifications
   */
  async hrFinalizeLeaveRequest(
    requestId: string,
    hrUserId: string,
    comments?: string,
  ): Promise<LeaveRequest> {
    const leaveRequest = await this.leaveRequestModel
      .findById(requestId)
      .populate('employeeId')
      .populate('leaveTypeId')
      .exec();

    if (!leaveRequest) {
      throw new NotFoundException('Leave request not found');
    }

    // Check if manager has already approved (first step must be approved)
    const managerStep = leaveRequest.approvalFlow[0];
    if (!managerStep || managerStep.status !== 'approved') {
      throw new BadRequestException('Manager approval is required before HR finalization');
    }

    // Check HR step
    const hrStep = leaveRequest.approvalFlow[1];
    if (!hrStep) {
      throw new BadRequestException('No HR approval step found for this leave request');
    }

    if (hrStep.status !== 'pending') {
      throw new BadRequestException('HR approval has already been processed');
    }

    // Update HR step
    hrStep.status = 'approved';
    hrStep.decidedBy = new Types.ObjectId(hrUserId);
    hrStep.decidedAt = new Date();

    // Mark overall request as approved
    leaveRequest.status = LeaveStatus.APPROVED;

    const saved = await leaveRequest.save();

    // REQ-029: Update balance - move from pending to taken
    const entitlement = await this.leaveEntitlementModel
      .findOne({
        employeeId: leaveRequest.employeeId,
        leaveTypeId: leaveRequest.leaveTypeId,
      })
      .exec();

    if (entitlement) {
      entitlement.pending -= leaveRequest.durationDays;
      entitlement.taken += leaveRequest.durationDays;
      await entitlement.save();
    }

    // REQ-030: Send finalization notifications
    await this.sendFinalizationNotifications(leaveRequest, hrUserId, 'approved', comments);

    return saved;
  }

  /**
   * REQ-026: HR Override Manager Decision
   * HR can escalate employee requests and override managers' decisions if needed
   * System must not allow negative vacation balances unless explicitly permitted by policy or HR override
   */
  async hrOverrideManagerDecision(
    requestId: string,
    hrUserId: string,
    newDecision: 'approved' | 'rejected',
    reason: string,
    allowNegativeBalance?: boolean,
  ): Promise<LeaveRequest> {
    const leaveRequest = await this.leaveRequestModel
      .findById(requestId)
      .populate('employeeId')
      .populate('leaveTypeId')
      .exec();

    if (!leaveRequest) {
      throw new NotFoundException('Leave request not found');
    }

    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('Override reason is required');
    }

    const previousStatus = leaveRequest.status;
    const previousManagerDecision = leaveRequest.approvalFlow[0]?.status;

    // Balance check removed - all leaves allowed to exceed balance
    // If paid leave exceeds balance, payroll will treat extra days as unpaid

    // Update both approval steps with HR override
    leaveRequest.approvalFlow[0] = {
      role: 'Manager',
      status: newDecision,
      decidedBy: new Types.ObjectId(hrUserId),
      decidedAt: new Date(),
    };

    leaveRequest.approvalFlow[1] = {
      role: 'HR',
      status: newDecision,
      decidedBy: new Types.ObjectId(hrUserId),
      decidedAt: new Date(),
    };

    // Update overall status
    leaveRequest.status = newDecision === 'approved' ? LeaveStatus.APPROVED : LeaveStatus.REJECTED;

    const saved = await leaveRequest.save();

    // Update entitlement based on new decision
    const entitlement = await this.leaveEntitlementModel
      .findOne({
        employeeId: leaveRequest.employeeId,
        leaveTypeId: leaveRequest.leaveTypeId,
      })
      .exec();

    if (entitlement) {
      if (previousStatus === LeaveStatus.PENDING) {
        if (newDecision === 'approved') {
          // Move from pending to taken
          entitlement.pending -= leaveRequest.durationDays;
          entitlement.taken += leaveRequest.durationDays;
        } else {
          // Return to remaining
          entitlement.pending -= leaveRequest.durationDays;
          entitlement.remaining += leaveRequest.durationDays;
        }
      } else if (previousStatus === LeaveStatus.REJECTED && newDecision === 'approved') {
        // Was rejected, now approving - deduct from remaining
        entitlement.remaining -= leaveRequest.durationDays;
        entitlement.taken += leaveRequest.durationDays;
      } else if (previousStatus === LeaveStatus.APPROVED && newDecision === 'rejected') {
        // Was approved, now rejecting - return to remaining
        entitlement.taken -= leaveRequest.durationDays;
        entitlement.remaining += leaveRequest.durationDays;
      }
      await entitlement.save();
    }

    // REQ-030: Send notifications about override
    await this.sendFinalizationNotifications(leaveRequest, hrUserId, newDecision, `HR Override: ${reason}`);

    return saved;
  }

  /**
   * REQ-027: Bulk Request Processing
   * Process multiple leave requests at once for efficient management
   */
  async bulkProcessLeaveRequests(
    requestIds: string[],
    action: 'approve' | 'reject',
    hrUserId: string,
    reason?: string,
  ): Promise<{ processed: number; failed: string[]; results: any[] }> {
    if (!requestIds || requestIds.length === 0) {
      throw new BadRequestException('No request IDs provided');
    }

    if (action === 'reject' && (!reason || reason.trim().length === 0)) {
      throw new BadRequestException('Rejection reason is required for bulk rejection');
    }

    const results: any[] = [];
    const failed: string[] = [];
    let processed = 0;

    for (const requestId of requestIds) {
      try {
        let result;
        if (action === 'approve') {
          result = await this.hrFinalizeLeaveRequest(requestId, hrUserId, reason);
        } else {
          result = await this.hrRejectLeaveRequest(requestId, hrUserId, reason!);
        }
        results.push({ requestId, status: 'success', data: result });
        processed++;
      } catch (error: any) {
        results.push({ requestId, status: 'failed', error: error.message });
        failed.push(requestId);
      }
    }

    return { processed, failed, results };
  }

  /**
   * HR Reject Leave Request (for bulk processing)
   */
  async hrRejectLeaveRequest(
    requestId: string,
    hrUserId: string,
    reason: string,
  ): Promise<LeaveRequest> {
    const leaveRequest = await this.leaveRequestModel
      .findById(requestId)
      .populate('employeeId')
      .populate('leaveTypeId')
      .exec();

    if (!leaveRequest) {
      throw new NotFoundException('Leave request not found');
    }

    // Update HR step
    const hrStep = leaveRequest.approvalFlow[1];
    if (hrStep) {
      hrStep.status = 'rejected';
      hrStep.decidedBy = new Types.ObjectId(hrUserId);
      hrStep.decidedAt = new Date();
    }

    // Mark overall request as rejected
    const previousStatus = leaveRequest.status;
    leaveRequest.status = LeaveStatus.REJECTED;

    const saved = await leaveRequest.save();

    // Return days to balance
    const entitlement = await this.leaveEntitlementModel
      .findOne({
        employeeId: leaveRequest.employeeId,
        leaveTypeId: leaveRequest.leaveTypeId,
      })
      .exec();

    if (entitlement && previousStatus === LeaveStatus.PENDING) {
      entitlement.pending -= leaveRequest.durationDays;
      entitlement.remaining += leaveRequest.durationDays;
      await entitlement.save();
    }

    // Send notifications
    await this.sendFinalizationNotifications(leaveRequest, hrUserId, 'rejected', reason);

    return saved;
  }

  /**
   * REQ-028: Verify Medical Documents
   * Get leave requests requiring medical document verification
   * Medical certificate required for sick leave > 1 day
   */
  async getRequestsRequiringMedicalVerification(): Promise<LeaveRequest[]> {
    // Get sick leave type(s)
    const sickLeaveTypes = await this.leaveTypeModel
      .find({ code: { $regex: /sick/i } })
      .exec();

    const sickLeaveTypeIds = sickLeaveTypes.map(t => t._id);

    // Find pending requests with sick leave > 1 day
    return this.leaveRequestModel
      .find({
        leaveTypeId: { $in: sickLeaveTypeIds },
        durationDays: { $gt: 1 },
        status: LeaveStatus.PENDING,
      })
      .populate({
        path: 'employeeId',
        populate: { path: 'primaryDepartmentId', select: 'name' }
      })
      .populate('leaveTypeId')
      .populate('attachmentId')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * REQ-028: Verify Medical Document for a specific request
   */
  async verifyMedicalDocument(
    requestId: string,
    hrUserId: string,
    verified: boolean,
    notes?: string,
  ): Promise<LeaveRequest> {
    const leaveRequest = await this.leaveRequestModel.findById(requestId).exec();

    if (!leaveRequest) {
      throw new NotFoundException('Leave request not found');
    }

    if (!leaveRequest.attachmentId) {
      throw new BadRequestException('No medical document attached to this request');
    }

    // If not verified, reject the request
    if (!verified) {
      return this.hrRejectLeaveRequest(
        requestId,
        hrUserId,
        notes || 'Medical document verification failed',
      );
    }

    // Document verified - can proceed with normal approval flow
    return leaveRequest;
  }

  /**
   * Get all leave requests pending HR finalization
   * (Manager approved, HR pending)
   */
  async getRequestsPendingHRFinalization(): Promise<LeaveRequest[]> {
    return this.leaveRequestModel
      .find({
        status: LeaveStatus.PENDING,
        'approvalFlow.0.status': 'approved',
        'approvalFlow.1.status': 'pending',
      })
      .populate({
        path: 'employeeId',
        populate: { path: 'primaryDepartmentId', select: 'name' }
      })
      .populate('leaveTypeId')
      .populate('attachmentId')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Get requests available for HR override
   * (Rejected by manager OR already processed)
   */
  async getRequestsForOverride(): Promise<LeaveRequest[]> {
    return this.leaveRequestModel
      .find({
        $or: [
          { status: LeaveStatus.REJECTED },
          { 'approvalFlow.0.status': 'rejected' },
          { status: LeaveStatus.APPROVED },
        ],
      })
      .populate({
        path: 'employeeId',
        populate: { path: 'primaryDepartmentId', select: 'name' }
      })
      .populate('leaveTypeId')
      .populate('attachmentId')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * REQ-030: Send finalization notifications
   * Notify employee, manager, and attendance coordinator
   */
  private async sendFinalizationNotifications(
    leaveRequest: any,
    hrUserId: string,
    decision: 'approved' | 'rejected',
    comments?: string,
  ): Promise<void> {
    try {
      const employee = leaveRequest.employeeId;
      const leaveType = leaveRequest.leaveTypeId;
      
      const employeeId = employee?._id?.toString() || employee?.toString();
      const employeeName = employee?.firstName && employee?.lastName 
        ? `${employee.firstName} ${employee.lastName}` 
        : 'Employee';
      const leaveTypeName = leaveType?.name || 'Leave';

      const dateFrom = new Date(leaveRequest.dates.from).toLocaleDateString();
      const dateTo = new Date(leaveRequest.dates.to).toLocaleDateString();

      const title = decision === 'approved' 
        ? `✅ Leave Request Finalized - ${leaveTypeName}` 
        : `❌ Leave Request Rejected - ${leaveTypeName}`;

      const message = decision === 'approved'
        ? `Your ${leaveTypeName} request from ${dateFrom} to ${dateTo} (${leaveRequest.durationDays} days) has been finalized and approved by HR. Your leave balance has been updated.${comments ? `\n\nComments: ${comments}` : ''}`
        : `Your ${leaveTypeName} request from ${dateFrom} to ${dateTo} (${leaveRequest.durationDays} days) has been rejected.${comments ? `\n\nReason: ${comments}` : ''}`;

      // Notify the employee
      await this.notificationService.createNotification(hrUserId, {
        title,
        message,
        targetEmployeeIds: [employeeId],
      });

      // Get the employee's manager (supervisor) for notification
      if (employee?.supervisorPositionId) {
        const allEmployees = await this.employeeProfileService.getAllEmployeeProfiles();
        const manager = allEmployees.find(
          (emp: any) => emp.primaryPositionId?._id?.toString() === employee.supervisorPositionId?.toString() ||
                        emp.primaryPositionId?.toString() === employee.supervisorPositionId?.toString()
        );

        if (manager) {
          await this.notificationService.createNotification(hrUserId, {
            title: `Leave Request ${decision === 'approved' ? 'Finalized' : 'Rejected'} - ${employeeName}`,
            message: `${employeeName}'s ${leaveTypeName} request from ${dateFrom} to ${dateTo} has been ${decision} by HR.${comments ? `\n\nComments: ${comments}` : ''}`,
            targetEmployeeIds: [(manager as any)._id.toString()],
          });
        }
      }
    } catch (error) {
      console.error('Failed to send finalization notifications:', error);
      // Don't throw - notifications are not critical for the main operation
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Apply rounding rule to accrued balance
   * BR 20
   */
  private applyRounding(value: number, rule: RoundingRule): number {
    switch (rule) {
      case RoundingRule.NONE:
        return value;
      case RoundingRule.ROUND:
        return Math.round(value);
      case RoundingRule.ROUND_UP:
        return Math.ceil(value);
      case RoundingRule.ROUND_DOWN:
        return Math.floor(value);
      default:
        return value;
    }
  }

  /**
   * Calculate net working days between two dates
   * BR 23
   */
  private async calculateNetWorkingDays(
    fromDate: Date,
    toDate: Date,
    year: number,
  ): Promise<number> {
    const calendar = await this.calendarModel.findOne({ year }).exec();
    let workingDays = 0;
    const currentDate = new Date(fromDate);

    while (currentDate <= toDate) {
      const dayOfWeek = currentDate.getDay();
      const isWeekend = dayOfWeek === 5 || dayOfWeek === 6; // Friday and Saturday

      // Check if it's a holiday
      const isHoliday = false; // Would check against calendar.holidays

      if (!isWeekend && !isHoliday) {
        workingDays++;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return workingDays;
  }
}

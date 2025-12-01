import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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

    Object.assign(policy, updateDto);
    return policy.save();
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
   * REQ-010: Configure calendar & blocked days
   * BR 33, 55
   */
  async createCalendar(createDto: CreateCalendarDto): Promise<Calendar> {
    const existingCalendar = await this.calendarModel.findOne({ year: createDto.year }).exec();
    if (existingCalendar) {
      throw new BadRequestException(`Calendar for year ${createDto.year} already exists`);
    }

    const calendar = new this.calendarModel({
      year: createDto.year,
      holidays: createDto.holidays?.map(id => new Types.ObjectId(id)) || [],
      blockedPeriods: createDto.blockedPeriods || [],
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
    const entitlement = await this.leaveEntitlementModel
      .findOne({ employeeId, leaveTypeId })
      .exec();

    if (!entitlement) {
      throw new NotFoundException('Leave entitlement not found for this employee and leave type');
    }

    // BR 31: Check available balance
    if (leaveType.deductible && createDto.durationDays > entitlement.remaining) {
      throw new BadRequestException(
        `Insufficient leave balance. Available: ${entitlement.remaining} days, Requested: ${createDto.durationDays} days`,
      );
    }

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

    // BR 32: Update pending balance
    entitlement.pending += createDto.durationDays;
    entitlement.remaining -= createDto.durationDays;
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
   * BR 25
   */
  async approveLeaveRequest(requestId: string, approvalDto: ApproveLeaveDto): Promise<LeaveRequest> {
    const leaveRequest = await this.leaveRequestModel.findById(requestId).exec();
    if (!leaveRequest) {
      throw new NotFoundException('Leave request not found');
    }

    // Find the approval step for this role
    const approvalStep = leaveRequest.approvalFlow.find(
      step => step.role === approvalDto.approverRole && step.status === 'pending',
    );

    if (!approvalStep) {
      throw new BadRequestException(`No pending approval found for role ${approvalDto.approverRole}`);
    }

    // Update approval step
    approvalStep.status = 'approved';
    approvalStep.decidedBy = new Types.ObjectId(approvalDto.approverId);
    approvalStep.decidedAt = new Date();

    // Check if all approvals are complete
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
   * BR 25
   */
  async rejectLeaveRequest(requestId: string, rejectionDto: RejectLeaveDto): Promise<LeaveRequest> {
    const leaveRequest = await this.leaveRequestModel.findById(requestId).exec();
    if (!leaveRequest) {
      throw new NotFoundException('Leave request not found');
    }

    const approvalStep = leaveRequest.approvalFlow.find(
      step => step.role === rejectionDto.approverRole && step.status === 'pending',
    );

    if (!approvalStep) {
      throw new BadRequestException(`No pending approval found for role ${rejectionDto.approverRole}`);
    }

    approvalStep.status = 'rejected';
    approvalStep.decidedBy = new Types.ObjectId(rejectionDto.approverId);
    approvalStep.decidedAt = new Date();

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
   * Get attachment by ID
   */
  async getAttachmentById(id: string): Promise<Attachment> {
    const attachment = await this.attachmentModel.findById(id).exec();
    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }
    return attachment;
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

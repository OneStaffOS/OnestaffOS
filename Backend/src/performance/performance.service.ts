import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AppraisalTemplate } from './models/appraisal-template.schema';
import { AppraisalCycle } from './models/appraisal-cycle.schema';
import { AppraisalAssignment } from './models/appraisal-assignment.schema';
import { AppraisalRecord } from './models/appraisal-record.schema';
import { AppraisalDispute } from './models/appraisal-dispute.schema';
import { EmployeeProfile } from '../employee-profile/models/employee-profile.schema';
import { Department } from '../organization-structure/models/department.schema';
import { CreateAppraisalTemplateDto } from './dto/create-appraisal-template.dto';
import { UpdateAppraisalTemplateDto } from './dto/update-appraisal-template.dto';
import { CreateAppraisalCycleDto } from './dto/create-appraisal-cycle.dto';
import { UpdateAppraisalCycleDto } from './dto/update-appraisal-cycle.dto';
import { CreateBulkAssignmentDto } from './dto/create-bulk-assignment.dto';
import { CreateAppraisalRatingDto } from './dto/create-appraisal-rating.dto';
import { UpdateAppraisalRatingDto } from './dto/update-appraisal-rating.dto';
import { AcknowledgeAppraisalDto } from './dto/acknowledge-appraisal.dto';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notifications/notification.service';
import {
  AppraisalCycleStatus,
  AppraisalAssignmentStatus,
  AppraisalRecordStatus,
  AppraisalDisputeStatus,
} from './enums/performance.enums';

@Injectable()
export class PerformanceService {
  constructor(
    @InjectModel(AppraisalTemplate.name)
    private appraisalTemplateModel: Model<AppraisalTemplate>,
    @InjectModel(AppraisalCycle.name)
    private appraisalCycleModel: Model<AppraisalCycle>,
    @InjectModel(AppraisalAssignment.name)
    private appraisalAssignmentModel: Model<AppraisalAssignment>,
    @InjectModel(AppraisalRecord.name)
    private appraisalRecordModel: Model<AppraisalRecord>,
    @InjectModel(AppraisalDispute.name)
    private appraisalDisputeModel: Model<AppraisalDispute>,
    @InjectModel(EmployeeProfile.name)
    private employeeProfileModel: Model<EmployeeProfile>,
    @InjectModel(Department.name)
    private departmentModel: Model<Department>,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
  ) {}

  // ========== PHASE 1: PLANNING AND SETUP ==========

  /**
   * REQ-PP-01: Configure standardized appraisal templates (HR Manager)
   */
  async createAppraisalTemplate(createDto: CreateAppraisalTemplateDto): Promise<AppraisalTemplate> {
    // Check if template name already exists
    const existingTemplate = await this.appraisalTemplateModel.findOne({ name: createDto.name });
    if (existingTemplate) {
      throw new BadRequestException('Template with this name already exists');
    }

    const template = new this.appraisalTemplateModel({
      _id: new Types.ObjectId(),
      name: createDto.name,
      description: createDto.description,
      templateType: createDto.templateType,
      ratingScale: createDto.ratingScale,
      criteria: createDto.criteria || [],
      instructions: createDto.instructions,
      applicableDepartmentIds: createDto.applicableDepartmentIds?.map(id => new Types.ObjectId(id)) || [],
      applicablePositionIds: createDto.applicablePositionIds?.map(id => new Types.ObjectId(id)) || [],
      isActive: createDto.isActive !== undefined ? createDto.isActive : true,
    });

    return await template.save();
  }

  /**
   * Update appraisal template
   */
  async updateAppraisalTemplate(
    templateId: string,
    updateDto: UpdateAppraisalTemplateDto,
  ): Promise<AppraisalTemplate> {
    const template = await this.appraisalTemplateModel.findById(templateId);
    if (!template) {
      throw new NotFoundException('Appraisal template not found');
    }

    // Check name uniqueness if being updated
    if (updateDto.name && updateDto.name !== template.name) {
      const existingTemplate = await this.appraisalTemplateModel.findOne({ name: updateDto.name });
      if (existingTemplate) {
        throw new BadRequestException('Template with this name already exists');
      }
    }

    // Update fields
    if (updateDto.name) template.name = updateDto.name;
    if (updateDto.description !== undefined) template.description = updateDto.description;
    if (updateDto.templateType) template.templateType = updateDto.templateType;
    if (updateDto.ratingScale) template.ratingScale = updateDto.ratingScale as any;
    if (updateDto.criteria) template.criteria = updateDto.criteria as any;
    if (updateDto.instructions !== undefined) template.instructions = updateDto.instructions;
    if (updateDto.applicableDepartmentIds) {
      template.applicableDepartmentIds = updateDto.applicableDepartmentIds.map(id => new Types.ObjectId(id));
    }
    if (updateDto.applicablePositionIds) {
      template.applicablePositionIds = updateDto.applicablePositionIds.map(id => new Types.ObjectId(id));
    }
    if (updateDto.isActive !== undefined) template.isActive = updateDto.isActive;

    return await template.save();
  }

  /**
   * Get all appraisal templates
   */
  async getAllTemplates(includeInactive: boolean = false): Promise<AppraisalTemplate[]> {
    const filter = includeInactive ? {} : { isActive: true };
    return await this.appraisalTemplateModel
      .find(filter)
      .populate('applicableDepartmentIds')
      .populate('applicablePositionIds')
      .exec();
  }

  /**
   * Get template by ID
   */
  async getTemplateById(templateId: string): Promise<AppraisalTemplate> {
    const template = await this.appraisalTemplateModel
      .findById(templateId)
      .populate('applicableDepartmentIds')
      .populate('applicablePositionIds')
      .exec();

    if (!template) {
      throw new NotFoundException('Appraisal template not found');
    }

    return template;
  }

  /**
   * REQ-PP-02: Define and schedule appraisal cycles (HR Manager/Employee)
   */
  async createAppraisalCycle(createDto: CreateAppraisalCycleDto): Promise<AppraisalCycle> {
    // Check if cycle name already exists
    const existingCycle = await this.appraisalCycleModel.findOne({ name: createDto.name });
    if (existingCycle) {
      throw new BadRequestException('Cycle with this name already exists');
    }

    // Validate dates
    if (createDto.startDate >= createDto.endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    const templateAssignments = createDto.templateAssignments?.map(assignment => ({
      templateId: new Types.ObjectId(assignment.templateId),
      departmentIds: assignment.departmentIds?.map(id => new Types.ObjectId(id)) || [],
    })) || [];

    const cycle = new this.appraisalCycleModel({
      _id: new Types.ObjectId(),
      name: createDto.name,
      description: createDto.description,
      cycleType: createDto.cycleType,
      startDate: createDto.startDate,
      endDate: createDto.endDate,
      managerDueDate: createDto.managerDueDate,
      employeeAcknowledgementDueDate: createDto.employeeAcknowledgementDueDate,
      templateAssignments,
      status: AppraisalCycleStatus.PLANNED,
    });

    // NOTE: Do NOT create assignments here. Assignments are created
    // exclusively via `createBulkAssignments` (REQ-PP-05). This keeps cycle
    // creation lightweight and defers employee assignment to a separate
    // bulk operation that can be retried or audited independently.
    const savedCycle = await cycle.save();

    // Notify department heads about the newly created cycle (best-effort)
    try {
      const deptIds: string[] = (savedCycle.templateAssignments || [])
        .flatMap((a: any) => (a.departmentIds || []).map((d: any) => d?.toString?.() || d))
        .filter((d: any) => !!d);

      const uniqueDeptIds = Array.from(new Set(deptIds));
      const headPositionIds = new Set<string>();

      for (const deptId of uniqueDeptIds) {
        try {
          const dept = await this.departmentModel.findById(deptId).select('headPositionId name').exec();
          if (dept && (dept as any).headPositionId) {
            headPositionIds.add((dept as any).headPositionId.toString());
          }
        } catch (err) {
          // ignore per-department failures
        }
      }

      if (headPositionIds.size > 0) {
        const title = `Appraisal cycle created: ${savedCycle.name}`;
        const message = `A new appraisal cycle "${savedCycle.name}" has been created. Please review and prepare.`;

        for (const posId of headPositionIds) {
          try {
            // targetPositionIds ensures only department heads (holders of that position)
            await this.notificationService.createNotification('system', {
              title,
              message,
              targetPositionIds: [posId],
            } as any);
          } catch (err) {
          }
        }
      }
    } catch (err) {
    }

    return savedCycle;
  }

  /**
   * Update appraisal cycle
   */
  async updateAppraisalCycle(
    cycleId: string,
    updateDto: UpdateAppraisalCycleDto,
  ): Promise<AppraisalCycle> {
    const cycle = await this.appraisalCycleModel.findById(cycleId);
    if (!cycle) {
      throw new NotFoundException('Appraisal cycle not found');
    }

    // Update fields
    if (updateDto.name) cycle.name = updateDto.name;
    if (updateDto.description !== undefined) cycle.description = updateDto.description;
    if (updateDto.cycleType) cycle.cycleType = updateDto.cycleType;
    if (updateDto.startDate) cycle.startDate = updateDto.startDate;
    if (updateDto.endDate) cycle.endDate = updateDto.endDate;
    if (updateDto.managerDueDate !== undefined) cycle.managerDueDate = updateDto.managerDueDate;
    if (updateDto.employeeAcknowledgementDueDate !== undefined) {
      cycle.employeeAcknowledgementDueDate = updateDto.employeeAcknowledgementDueDate;
    }
    if (updateDto.templateAssignments) {
      cycle.templateAssignments = updateDto.templateAssignments.map(assignment => ({
        templateId: new Types.ObjectId(assignment.templateId),
        departmentIds: assignment.departmentIds?.map(id => new Types.ObjectId(id)) || [],
      })) as any;
    }

    return await cycle.save();
  }

  /**
   * Get all appraisal cycles
   */
  async getAllCycles(): Promise<AppraisalCycle[]> {
    return await this.appraisalCycleModel
      .find()
      .populate('templateAssignments.templateId')
      .populate('templateAssignments.departmentIds')
      .sort({ startDate: -1 })
      .exec();
  }

  /**
   * Get cycle by ID
   */
  async getCycleById(cycleId: string): Promise<AppraisalCycle> {
    const cycle = await this.appraisalCycleModel
      .findById(cycleId)
      .populate('templateAssignments.templateId')
      .populate('templateAssignments.departmentIds')
      .exec();

    if (!cycle) {
      throw new NotFoundException('Appraisal cycle not found');
    }

    return cycle;
  }

  /**
   * Activate appraisal cycle
   */
  async activateCycle(cycleId: string): Promise<AppraisalCycle> {
    const cycle = await this.appraisalCycleModel.findById(cycleId);
    if (!cycle) {
      throw new NotFoundException('Appraisal cycle not found');
    }

    cycle.status = AppraisalCycleStatus.ACTIVE;
    return await cycle.save();
  }

  /**
   * Close appraisal cycle
   */
  async closeCycle(cycleId: string): Promise<AppraisalCycle> {
    const cycle = await this.appraisalCycleModel.findById(cycleId);
    if (!cycle) {
      throw new NotFoundException('Appraisal cycle not found');
    }

    cycle.status = AppraisalCycleStatus.CLOSED;
    return await cycle.save();
  }

  /**
   * REQ-PP-05: Assign appraisal forms in bulk (HR Employee)
   */
  async createBulkAssignments(createdByEmployeeId: string, createDto: CreateBulkAssignmentDto): Promise<AppraisalAssignment[]> {
    // Verify cycle exists
    const cycle = await this.appraisalCycleModel.findById(createDto.cycleId);
    if (!cycle) {
      throw new NotFoundException('Appraisal cycle not found');
    }

    // Verify template exists
    const template = await this.appraisalTemplateModel.findById(createDto.templateId);
    if (!template) {
      throw new NotFoundException('Appraisal template not found');
    }

    const assignments: AppraisalAssignment[] = [];
    let employeesToAssign: any[] = [];

    // Determine employees to assign based on input
    if (createDto.employeeIds && createDto.employeeIds.length > 0) {
      // Direct employee assignment
      employeesToAssign = await this.employeeProfileModel
        .find({ _id: { $in: createDto.employeeIds.map(id => new Types.ObjectId(id)) } })
        .populate('primaryDepartmentId')
        .populate('primaryPositionId')
        .populate('supervisorPositionId')
        .exec();
    } else if (createDto.departmentIds && createDto.departmentIds.length > 0) {
      // Department-based assignment
      employeesToAssign = await this.employeeProfileModel
        .find({ 
          primaryDepartmentId: { $in: createDto.departmentIds.map(id => new Types.ObjectId(id)) },
          status: 'ACTIVE'
        })
        .populate('primaryDepartmentId')
        .populate('primaryPositionId')
        .populate('supervisorPositionId')
        .exec();
    } else {
      throw new BadRequestException('Either employeeIds or departmentIds must be provided');
    }

    if (employeesToAssign.length === 0) {
      throw new NotFoundException('No eligible employees found for assignment');
    }

    // Create assignments for each employee
    for (const employee of employeesToAssign) {
      // Check if assignment already exists for this employee in this cycle
      const existingAssignment = await this.appraisalAssignmentModel.findOne({
        cycleId: new Types.ObjectId(createDto.cycleId),
        employeeProfileId: new Types.ObjectId(employee._id),
        templateId: new Types.ObjectId(createDto.templateId),
      });

      if (existingAssignment) {
        // Skip if already assigned
        continue;
      }

      // Determine manager - prefer explicit manager provided in DTO, otherwise get from supervisorPositionId
      let managerId = employee._id; // Default to self if no manager found
      if (createDto.managerEmployeeId) {
        try {
          managerId = new Types.ObjectId(createDto.managerEmployeeId);
        } catch (err) {
          // If provided id is invalid, fallback to resolved supervisor
        }
      }
      
      if (!createDto.managerEmployeeId && employee.supervisorPositionId) {
        // Find employees with this supervisor position as their primary position
        const supervisor = await this.employeeProfileModel
          .findOne({ primaryPositionId: employee.supervisorPositionId })
          .select('_id')
          .exec();
        
        if (supervisor) {
          managerId = supervisor._id;
        }
      }

      const assignment = new this.appraisalAssignmentModel({
        _id: new Types.ObjectId(),
        cycleId: new Types.ObjectId(createDto.cycleId),
        templateId: new Types.ObjectId(createDto.templateId),
        employeeProfileId: new Types.ObjectId(employee._id),
        managerProfileId: new Types.ObjectId(managerId),
        departmentId: employee.primaryDepartmentId?._id || employee.primaryDepartmentId,
        positionId: employee.primaryPositionId?._id || employee.primaryPositionId,
        status: AppraisalAssignmentStatus.NOT_STARTED,
        assignedAt: new Date(),
        dueDate: createDto.dueDate,
      });

      const saved = await assignment.save();
      assignments.push(saved);

      // Send notification to the employee about the assignment (best-effort)
      try {
        const cycleDoc = await this.appraisalCycleModel.findById(createDto.cycleId).select('name').exec();
        const templateDoc = await this.appraisalTemplateModel.findById(createDto.templateId).select('name').exec();
        const title = `Appraisal assigned: ${cycleDoc?.name || 'New Cycle'}`;
        const msgParts: string[] = [];
        if (templateDoc?.name) msgParts.push(`Template: ${templateDoc.name}`);
        if (createDto.dueDate) msgParts.push(`Due: ${new Date(createDto.dueDate).toLocaleString()}`);
        const message = `You have been assigned an appraisal. ${msgParts.join(' — ')}`;
        await this.notificationService.createNotification(createdByEmployeeId || 'system', {
          title,
          message,
          targetEmployeeIds: [ (employee._id || employee).toString() ],
          // sendAt omitted -> immediate
        } as any);
      } catch (err) {
      }
    }

    // Optionally, we could add consolidated manager notifications here. Skipping for now.

    return assignments;
  }

  /**
   * Get assignments for a cycle
   */
  async getAssignmentsByCycle(cycleId: string): Promise<AppraisalAssignment[]> {
    return await this.appraisalAssignmentModel
      .find({ cycleId: new Types.ObjectId(cycleId) })
      .populate('templateId')
      .populate('employeeProfileId')
      .populate('managerProfileId')
      .populate('departmentId')
      .populate('positionId')
      .exec();
  }

  /**
   * REQ-PP-13: Get assignments for a manager (Line Manager)
   */
  async getAssignmentsForManager(managerEmployeeId: string): Promise<AppraisalAssignment[]> {
    return await this.appraisalAssignmentModel
      .find({ managerProfileId: new Types.ObjectId(managerEmployeeId) })
      .populate('templateId')
      .populate('employeeProfileId')
      .populate('cycleId')
      .populate('departmentId')
      .populate('positionId')
      .sort({ dueDate: 1 })
      .exec();
  }

  /**
   * Get single assignment by id with authorization checks.
   * - Managers see assignments where they are the assigned manager
   * - Employees see their own assignment
   * - HR/Admin roles can view any assignment
   */
  async getAssignmentById(user: any, assignmentId: string): Promise<AppraisalAssignment> {
    const assignment = await this.appraisalAssignmentModel
      .findById(assignmentId)
      .populate('templateId')
      .populate('employeeProfileId')
      .populate('managerProfileId')
      .populate('cycleId')
      .populate('departmentId')
      .populate('positionId')
      .populate('latestAppraisalId')
      .exec();

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    // Ensure template details are present — some queries may return only ObjectId
    try {
      const templatePopulated = assignment.templateId && typeof assignment.templateId === 'object' && (assignment.templateId as any).criteria;
      if (!templatePopulated && assignment.templateId) {
        const templateId = assignment.templateId.toString();
        const tpl = await this.appraisalTemplateModel.findById(templateId).exec();
        if (tpl) {
          // attach full template document for frontend
          (assignment as any).templateId = tpl;
        }
      }
    } catch (err) {
      // ignore — template population is best-effort
    }

    const userEmployeeId = user?.employeeId || user?.sub;
    const userRoles: string[] = user?.roles || [];

    // HR/Admin roles can access any assignment
    const isHR = userRoles.includes('HR_MANAGER') || userRoles.includes('HR_ADMIN') || userRoles.includes('Admin') || userRoles.includes('HR_Employee');
    if (isHR) return assignment;

    // If user is the assigned manager
    if (assignment.managerProfileId) {
      const mgrId = assignment.managerProfileId._id ? assignment.managerProfileId._id.toString() : assignment.managerProfileId.toString();
      if (mgrId === userEmployeeId) return assignment;
    }

    // If user is the employee being evaluated
    if (assignment.employeeProfileId) {
      const empId = assignment.employeeProfileId._id ? assignment.employeeProfileId._id.toString() : assignment.employeeProfileId.toString();
      if (empId === userEmployeeId) return assignment;
    }

    // Not authorized to view
    throw new NotFoundException('Assignment not found');
  }

  /**
   * Get my assignments (Employee)
   */
  async getMyAssignments(employeeId: string): Promise<AppraisalAssignment[]> {
    return await this.appraisalAssignmentModel
      .find({ employeeProfileId: new Types.ObjectId(employeeId) })
      .populate('templateId')
      .populate('managerProfileId')
      .populate('cycleId')
      .populate('departmentId')
      .populate('latestAppraisalId')
      .sort({ assignedAt: -1 })
      .exec();
  }

  /**
   * Repair manager references on existing assignments.
   * For each assignment (optionally filtered by cycleId) resolve the employee's
   * supervisorPositionId and find the employee whose primaryPositionId matches
   * that supervisor position. If found, set assignment.managerProfileId to that
   * employee's _id. Returns a summary of repaired/skipped counts.
   * Accessible by HR/Admin via controller wrapper.
   */
  async repairAssignmentManagers(cycleId?: string): Promise<{ repaired: number; skipped: number; errors: number }> {
    const query: any = {};
    if (cycleId) query.cycleId = new Types.ObjectId(cycleId);

    const assignments = await this.appraisalAssignmentModel
      .find(query)
      .populate('employeeProfileId')
      .populate('managerProfileId')
      .exec();

    let repaired = 0;
    let skipped = 0;
    let errors = 0;

    for (const assignment of assignments) {
      try {
        // Resolve employee profile
        let employee: any = assignment.employeeProfileId;
        if (!employee) {
          employee = await this.employeeProfileModel.findById(assignment.employeeProfileId).populate('supervisorPositionId').exec();
        }

        if (!employee) {
          skipped++;
          continue;
        }

        const supervisorPos = employee.supervisorPositionId?._id || employee.supervisorPositionId;
        if (!supervisorPos) {
          skipped++;
          continue;
        }

        // Find the supervisor employee who has this position as their primaryPositionId
        const supervisor = await this.employeeProfileModel
          .findOne({ primaryPositionId: new Types.ObjectId(supervisorPos) })
          .select('_id')
          .exec();

        if (!supervisor) {
          skipped++;
          continue;
        }

        const currentMgrId = assignment.managerProfileId?._id ? assignment.managerProfileId._id.toString() : assignment.managerProfileId?.toString?.();
        const supervisorIdStr = supervisor._id.toString();

        if (currentMgrId !== supervisorIdStr) {
          assignment.managerProfileId = new Types.ObjectId(supervisor._id);
          await assignment.save();
          repaired++;
        } else {
          skipped++;
        }
      } catch (err) {
        // Count and continue
        errors++;
        continue;
      }
    }

    return { repaired, skipped, errors };
  }

  // ========== PHASE 2: EVALUATION AND REVIEW ==========

  /**
   * REQ-AE-03, REQ-AE-04: Create/submit appraisal rating (Line Manager)
   */
  async createAppraisalRating(
    managerEmployeeId: string,
    createDto: CreateAppraisalRatingDto,
    isCallerDeptHead: boolean = false,
  ): Promise<AppraisalRecord> {
    // Verify assignment exists
    const assignment = await this.appraisalAssignmentModel.findById(createDto.assignmentId);
    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    // Allow creation by the assigned manager or by the department head
    const deptIdForAssignment = assignment.departmentId?._id || assignment.departmentId;
    const managerIsHead = isCallerDeptHead || await this.isDepartmentHead(managerEmployeeId, deptIdForAssignment);
    if (!assignment.managerProfileId.equals(new Types.ObjectId(managerEmployeeId)) && !managerIsHead) {
      throw new ForbiddenException('Not authorized to create appraisal for this assignment');
    }

    // Check if a record already exists
    const existingRecord = await this.appraisalRecordModel.findOne({
      assignmentId: new Types.ObjectId(createDto.assignmentId),
    });

    if (existingRecord) {
      throw new BadRequestException('Appraisal record already exists for this assignment');
    }

    // Managers using the manager-facing endpoints may only submit ratings by default.
    // Manager-level narrative fields will be accepted only when the acting user
    // is the department head (handled via `managerIsHead` above).

    const record = new this.appraisalRecordModel({
      _id: new Types.ObjectId(),
      assignmentId: new Types.ObjectId(createDto.assignmentId),
      cycleId: assignment.cycleId,
      templateId: assignment.templateId,
      employeeProfileId: assignment.employeeProfileId,
      managerProfileId: assignment.managerProfileId,
      ratings: createDto.ratings,
      totalScore: createDto.totalScore,
      overallRatingLabel: createDto.overallRatingLabel,
      // Only accept narrative fields when the acting user is the department head
      managerSummary: managerIsHead ? createDto.managerSummary : undefined,
      strengths: managerIsHead ? createDto.strengths : undefined,
      improvementAreas: managerIsHead ? createDto.improvementAreas : undefined,
      status: AppraisalRecordStatus.DRAFT,
    });

    const saved = await record.save();

    // Update assignment status
    assignment.status = AppraisalAssignmentStatus.IN_PROGRESS;
    assignment.latestAppraisalId = saved._id as Types.ObjectId;
    await assignment.save();

    return saved;
  }

  /**
   * Update appraisal rating (Line Manager)
   */
  async updateAppraisalRating(
    managerEmployeeId: string,
    recordId: string,
    updateDto: UpdateAppraisalRatingDto,
    isCallerDeptHead: boolean = false,
  ): Promise<AppraisalRecord> {
    const record = await this.appraisalRecordModel.findById(recordId);
    if (!record) {
      throw new NotFoundException('Appraisal record not found');
    }

    // Allow update by the assigned manager or by the department head
    const assignment = await this.appraisalAssignmentModel.findById(record.assignmentId).select('departmentId managerProfileId').lean();
    const deptIdForAssignment = assignment?.departmentId?._id || assignment?.departmentId;
    const managerIsHeadForUpdate = isCallerDeptHead || await this.isDepartmentHead(managerEmployeeId, deptIdForAssignment);

    const isAssignedManager = record.managerProfileId.equals(new Types.ObjectId(managerEmployeeId));
    if (!isAssignedManager && !managerIsHeadForUpdate) {
      throw new ForbiddenException('Not authorized to update this appraisal record');
    }

    // If the record is not a draft, only a department head may update it,
    // and in that case we restrict updates to narrative fields only.
    if (record.status !== AppraisalRecordStatus.DRAFT) {
      if (!managerIsHeadForUpdate) {
        throw new BadRequestException('Only draft records can be updated');
      }

      // Department head updating a non-draft record: only allow narrative fields
      if (updateDto.managerSummary !== undefined) record.managerSummary = updateDto.managerSummary;
      if (updateDto.strengths !== undefined) record.strengths = updateDto.strengths;
      if (updateDto.improvementAreas !== undefined) record.improvementAreas = updateDto.improvementAreas;

      return await record.save();
    }

    // For draft records, allow the assigned manager to update ratings and scores.
    if (updateDto.ratings) record.ratings = updateDto.ratings as any;
    if (updateDto.totalScore !== undefined) record.totalScore = updateDto.totalScore;
    if (updateDto.overallRatingLabel) record.overallRatingLabel = updateDto.overallRatingLabel;

    // Only allow department head to modify narrative fields even on drafts
    if (managerIsHeadForUpdate) {
      if (updateDto.managerSummary !== undefined) record.managerSummary = updateDto.managerSummary;
      if (updateDto.strengths !== undefined) record.strengths = updateDto.strengths;
      if (updateDto.improvementAreas !== undefined) record.improvementAreas = updateDto.improvementAreas;
    }

    return await record.save();
  }

  /**
   * Submit appraisal rating (Line Manager)
   */
  async submitAppraisalRating(managerEmployeeId: string, recordId: string, isCallerDeptHead: boolean = false): Promise<AppraisalRecord> {
    const record = await this.appraisalRecordModel.findById(recordId);
    if (!record) {
      throw new NotFoundException('Appraisal record not found');
    }

    // Allow submission by the assigned manager or by the department head
    const assignmentForSubmit = await this.appraisalAssignmentModel.findById(record.assignmentId).select('departmentId').lean();
    const deptIdForSubmit = assignmentForSubmit?.departmentId?._id || assignmentForSubmit?.departmentId;
    const managerIsHeadForSubmit = isCallerDeptHead || await this.isDepartmentHead(managerEmployeeId, deptIdForSubmit);

    const isAssignedManagerForSubmit = record.managerProfileId.equals(new Types.ObjectId(managerEmployeeId));
    if (!isAssignedManagerForSubmit && !managerIsHeadForSubmit) {
      throw new ForbiddenException('Not authorized to submit this appraisal record');
    }

    if (record.status !== AppraisalRecordStatus.DRAFT) {
      throw new BadRequestException('Only draft records can be submitted');
    }

    record.status = AppraisalRecordStatus.MANAGER_SUBMITTED;
    record.managerSubmittedAt = new Date();

    const saved = await record.save();

    // Update assignment status
    await this.appraisalAssignmentModel.updateOne(
      { _id: record.assignmentId },
      { status: AppraisalAssignmentStatus.SUBMITTED, submittedAt: new Date() },
    );

    return saved;
  }

  // ========== PHASE 3 & 4: HR MONITORING, PUBLICATION & FEEDBACK ==========

  /**
   * REQ-AE-10: Get appraisal progress dashboard (HR Manager)
   */
  async getAppraisalProgressDashboard(cycleId?: string): Promise<any> {
    const filter: any = {};
    if (cycleId) filter.cycleId = new Types.ObjectId(cycleId);

    const assignments = await this.appraisalAssignmentModel
      .find(filter)
      .populate('departmentId', 'name')
      .populate('employeeProfileId', 'firstName lastName')
      .populate('managerProfileId', 'firstName lastName')
      .exec();

    // Group by status
    const statusCounts = assignments.reduce((acc, assignment) => {
      acc[assignment.status] = (acc[assignment.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Group by department
    const departmentProgress: any = {};
    assignments.forEach(assignment => {
      const deptName = (assignment.departmentId as any)?.name || 'Unknown';
      if (!departmentProgress[deptName]) {
        departmentProgress[deptName] = {
          total: 0,
          notStarted: 0,
          inProgress: 0,
          submitted: 0,
          published: 0,
          acknowledged: 0,
        };
      }
      departmentProgress[deptName].total++;
      departmentProgress[deptName][assignment.status.toLowerCase().replace('_', '')]++;
    });

    return {
      totalAssignments: assignments.length,
      statusCounts,
      departmentProgress,
      assignments: assignments.map(a => ({
        id: a._id,
        employee: a.employeeProfileId,
        manager: a.managerProfileId,
        department: a.departmentId,
        status: a.status,
        assignedAt: a.assignedAt,
        dueDate: a.dueDate,
        submittedAt: a.submittedAt,
      })),
    };
  }

  /**
   * Publish appraisal results (HR Employee/Manager)
   */
  async publishAppraisalResults(hrEmployeeId: string, recordIds: string[]): Promise<AppraisalRecord[]> {
    const published: AppraisalRecord[] = [];

    // Collect department head positions to notify after publishing
    const headPositionIdsToNotify = new Set<string>();

    for (const recordId of recordIds) {
      const record = await this.appraisalRecordModel.findById(recordId);
      if (!record) continue;

      if (record.status !== AppraisalRecordStatus.MANAGER_SUBMITTED) {
        continue; // Skip non-submitted records
      }

      record.status = AppraisalRecordStatus.HR_PUBLISHED;
      record.hrPublishedAt = new Date();
      record.publishedByEmployeeId = new Types.ObjectId(hrEmployeeId);

      const saved = await record.save();
      published.push(saved);

      // Update assignment status
      await this.appraisalAssignmentModel.updateOne(
        { _id: record.assignmentId },
        { status: AppraisalAssignmentStatus.PUBLISHED, publishedAt: new Date() },
      );

      // Update employee profile with latest appraisal data
      await this.employeeProfileModel.updateOne(
        { _id: record.employeeProfileId },
        {
          lastAppraisalRecordId: record._id,
          lastAppraisalCycleId: record.cycleId,
          lastAppraisalTemplateId: record.templateId,
          lastAppraisalDate: record.hrPublishedAt,
          lastAppraisalScore: record.totalScore,
          lastAppraisalRatingLabel: record.overallRatingLabel,
        },
      );

      // Try to resolve department head position for notification (best-effort)
      try {
        const assignment = await this.appraisalAssignmentModel.findById(record.assignmentId).select('departmentId').exec();
        const deptId = assignment?.departmentId?._id?.toString?.() || assignment?.departmentId?.toString?.();
        if (deptId) {
          const dept = await this.departmentModel.findById(deptId).select('headPositionId').exec();
          if (dept && (dept as any).headPositionId) {
            headPositionIdsToNotify.add((dept as any).headPositionId.toString());
          }
        }
      } catch (err) {
      }
    }

    // Notify collected department heads (best-effort)
    if (headPositionIdsToNotify.size > 0) {
      try {
        const title = `Appraisal results published`;
        const message = `HR has published appraisal results. Please review your department's published appraisals.`;
        for (const posId of headPositionIdsToNotify) {
          try {
            await this.notificationService.createNotification(hrEmployeeId || 'system', {
              title,
              message,
              targetPositionIds: [posId],
            } as any);
            } catch (err) {
          }
        }
      } catch (err) {
      }
    }

    return published;
  }

  /**
   * Publish appraisals in bulk by department
   */
  async publishBulkByDepartment(
    hrEmployeeId: string,
    departmentId: string,
    cycleId?: string,
  ): Promise<{ published: number; skipped: number }> {
    const query: any = {
      departmentId: new Types.ObjectId(departmentId),
      status: AppraisalAssignmentStatus.SUBMITTED,
    };

    if (cycleId) {
      query.cycleId = new Types.ObjectId(cycleId);
    }

    const assignments = await this.appraisalAssignmentModel.find(query).exec();

    let published = 0;
    let skipped = 0;

    for (const assignment of assignments) {
      if (!assignment.latestAppraisalId) {
        skipped++;
        continue;
      }

      const record = await this.appraisalRecordModel.findById(assignment.latestAppraisalId);
      if (!record || record.status !== AppraisalRecordStatus.MANAGER_SUBMITTED) {
        skipped++;
        continue;
      }

      record.status = AppraisalRecordStatus.HR_PUBLISHED;
      record.hrPublishedAt = new Date();
      record.publishedByEmployeeId = new Types.ObjectId(hrEmployeeId);
      await record.save();

      assignment.status = AppraisalAssignmentStatus.PUBLISHED;
      assignment.publishedAt = new Date();
      await assignment.save();

      // Update employee profile
      await this.employeeProfileModel.updateOne(
        { _id: record.employeeProfileId },
        {
          lastAppraisalRecordId: record._id,
          lastAppraisalCycleId: record.cycleId,
          lastAppraisalTemplateId: record.templateId,
          lastAppraisalDate: record.hrPublishedAt,
          lastAppraisalScore: record.totalScore,
          lastAppraisalRatingLabel: record.overallRatingLabel,
        },
      );

      published++;
    }

    return { published, skipped };
  }

  /**
   * REQ-OD-01: View appraisal results (Employee)
   */
  async getMyAppraisalResults(employeeId: string): Promise<AppraisalRecord[]> {
    const filter: any = {
      employeeProfileId: new Types.ObjectId(employeeId),
      status: { $in: [
        AppraisalRecordStatus.MANAGER_SUBMITTED,
      ] },
    };

    return await this.appraisalRecordModel
      .find(filter)
      .populate('cycleId')
      .populate('templateId')
      .populate('managerProfileId')
      .sort({ hrPublishedAt: -1 })
      .exec();
  }

  /**
   * Get appraisal record by ID
   */
  async getAppraisalRecordById(recordId: string): Promise<AppraisalRecord> {
    // Validate incoming id to avoid Mongoose CastError when a non-ObjectId
    // string (e.g. a route segment like "appraisals") is passed accidentally.
    if (!Types.ObjectId.isValid(recordId)) {
      throw new BadRequestException('Invalid appraisal id');
    }

    const record = await this.appraisalRecordModel
      .findById(new Types.ObjectId(recordId))
      .populate('cycleId')
      .populate('templateId')
      .populate('employeeProfileId')
      .populate('managerProfileId')
      .populate('assignmentId')
      .exec();

    if (!record) {
      throw new NotFoundException('Appraisal record not found');
    }

    // Mark as viewed if not already
    if (!record.employeeViewedAt) {
      record.employeeViewedAt = new Date();
      await record.save();
    }

    return record;
  }

  /**
   * Acknowledge appraisal (Employee)
   */
  async acknowledgeAppraisal(
    employeeId: string,
    recordId: string,
    acknowledgeDto: AcknowledgeAppraisalDto,
  ): Promise<AppraisalRecord> {
    const record = await this.appraisalRecordModel.findById(recordId);
    if (!record) {
      throw new NotFoundException('Appraisal record not found');
    }

    if (!record.employeeProfileId.equals(new Types.ObjectId(employeeId))) {
      throw new BadRequestException('Record does not belong to this employee');
    }

    if (record.status !== AppraisalRecordStatus.HR_PUBLISHED) {
      throw new BadRequestException('Only published records can be acknowledged');
    }

    record.employeeAcknowledgedAt = new Date();
    record.employeeAcknowledgementComment = acknowledgeDto.comment;

    const saved = await record.save();

    // Update assignment status
    await this.appraisalAssignmentModel.updateOne(
      { _id: record.assignmentId },
      { status: AppraisalAssignmentStatus.ACKNOWLEDGED },
    );

    return saved;
  }

  // ========== PHASE 4: DISPUTE AND RESOLUTION ==========

  /**
   * REQ-AE-07: Raise dispute (Employee)
   */
  async createDispute(employeeId: string, createDto: CreateDisputeDto): Promise<AppraisalDispute> {
    // Verify appraisal exists and belongs to this employee
    const appraisal = await this.appraisalRecordModel.findById(createDto.appraisalId);
    if (!appraisal) {
      throw new NotFoundException('Appraisal not found');
    }

    if (!appraisal.employeeProfileId.equals(new Types.ObjectId(employeeId))) {
      throw new BadRequestException('Appraisal does not belong to this employee');
    }

    // Check if dispute already exists
    const existingDispute = await this.appraisalDisputeModel.findOne({
      appraisalId: new Types.ObjectId(createDto.appraisalId),
    });

    if (existingDispute) {
      throw new BadRequestException('Dispute already exists for this appraisal');
    }

    const dispute = new this.appraisalDisputeModel({
      _id: new Types.ObjectId(),
      appraisalId: new Types.ObjectId(createDto.appraisalId),
      assignmentId: appraisal.assignmentId,
      cycleId: appraisal.cycleId,
      raisedByEmployeeId: new Types.ObjectId(employeeId),
      reason: createDto.reason,
      details: createDto.details,
      status: AppraisalDisputeStatus.OPEN,
      submittedAt: new Date(),
    });

    return await dispute.save();
  }

  /**
   * Get all disputes (HR Manager)
   */
  async getAllDisputes(): Promise<AppraisalDispute[]> {
    return await this.appraisalDisputeModel
      .find()
      .populate({
        path: 'appraisalId',
        populate: [
          { path: 'employeeProfileId' },
          { path: 'managerProfileId' },
          { path: 'cycleId' },
          { path: 'templateId' },
        ],
      })
      .populate('raisedByEmployeeId')
      .populate('assignedReviewerEmployeeId')
      .populate('resolvedByEmployeeId')
      .populate('cycleId')
      .sort({ submittedAt: -1 })
      .exec();
  }

  /**
   * Get pending disputes
   */
  async getPendingDisputes(): Promise<AppraisalDispute[]> {
    return await this.appraisalDisputeModel
      .find({ status: { $in: [AppraisalDisputeStatus.OPEN, AppraisalDisputeStatus.UNDER_REVIEW] } })
      .populate({
        path: 'appraisalId',
        populate: [
          { path: 'employeeProfileId' },
          { path: 'managerProfileId' },
          { path: 'cycleId' },
          { path: 'templateId' },
        ],
      })
      .populate('raisedByEmployeeId')
      .populate('cycleId')
      .sort({ submittedAt: -1 })
      .exec();
  }

  /**
   * Get my disputes (Employee)
   */
  async getMyDisputes(employeeId: string): Promise<AppraisalDispute[]> {
    return await this.appraisalDisputeModel
      .find({ raisedByEmployeeId: new Types.ObjectId(employeeId) })
      .populate({
        path: 'appraisalId',
        populate: [
          { path: 'employeeProfileId' },
          { path: 'managerProfileId' },
          { path: 'cycleId' },
          { path: 'templateId' },
        ],
      })
      .populate('assignedReviewerEmployeeId')
      .populate('resolvedByEmployeeId')
      .populate('cycleId')
      .sort({ submittedAt: -1 })
      .exec();
  }

  /**
   * REQ-OD-07: Resolve dispute (HR Manager)
   */
  async resolveDispute(
    hrManagerEmployeeId: string,
    disputeId: string,
    resolveDto: ResolveDisputeDto,
  ): Promise<AppraisalDispute> {
    // Validate dispute id format
    if (!Types.ObjectId.isValid(disputeId)) {
      throw new BadRequestException('Invalid dispute id');
    }

    // Explicit ObjectId lookup (robust across environments). Fall back to string lookup
    // only if constructing an ObjectId throws unexpectedly.
    let dispute;
    try {
      dispute = await this.appraisalDisputeModel.findOne({ _id: new Types.ObjectId(disputeId) }).exec();
    } catch (err) {
      dispute = await this.appraisalDisputeModel.findOne({ _id: disputeId }).exec();
    }

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    dispute.status = resolveDto.status;
    dispute.resolutionSummary = resolveDto.resolutionSummary;
    dispute.resolvedAt = new Date();
      if (hrManagerEmployeeId) {
      try {
        dispute.resolvedByEmployeeId = new Types.ObjectId(hrManagerEmployeeId);
      } catch (err) {
      }
    }

    // If HR adjusted the appraisal as part of dispute resolution, apply changes
    // to the underlying appraisal record and update the employee profile summary
    // when applicable. Adjusted fields in the DTO are optional and only
    // applied when the status is ADJUSTED.
    if (resolveDto.status === AppraisalDisputeStatus.ADJUSTED) {
      try {
        const appraisal = await this.appraisalRecordModel.findById(dispute.appraisalId).exec();
        if (appraisal) {
          let changed = false;
          if (resolveDto.adjustedRatings) {
            appraisal.ratings = resolveDto.adjustedRatings as any;
            changed = true;
          }

          if (typeof resolveDto.adjustedTotalScore === 'number') {
            appraisal.totalScore = resolveDto.adjustedTotalScore;
            changed = true;
          }

          if (resolveDto.adjustedOverallRatingLabel) {
            appraisal.overallRatingLabel = resolveDto.adjustedOverallRatingLabel;
            changed = true;
          }

          if (changed) {
            const beforeSnapshot = { totalScore: (appraisal as any).totalScore, ratings: (appraisal as any).ratings, overallRatingLabel: (appraisal as any).overallRatingLabel };
            await appraisal.save();
            const afterSnapshot = { totalScore: (appraisal as any).totalScore, ratings: (appraisal as any).ratings, overallRatingLabel: (appraisal as any).overallRatingLabel };

            // If the appraisal was already published by HR, ensure the employee
            // profile reflects the adjusted values shown as the latest appraisal.
            try {
              if (appraisal.status === AppraisalRecordStatus.HR_PUBLISHED) {
                await this.employeeProfileModel.updateOne(
                  { _id: appraisal.employeeProfileId },
                  {
                    lastAppraisalRecordId: appraisal._id,
                    lastAppraisalCycleId: appraisal.cycleId,
                    lastAppraisalTemplateId: appraisal.templateId,
                    lastAppraisalDate: appraisal.hrPublishedAt || new Date(),
                    lastAppraisalScore: appraisal.totalScore,
                    lastAppraisalRatingLabel: appraisal.overallRatingLabel,
                  },
                );

                // reflect adjusted final rating on the dispute for frontend convenience
                try {
                  dispute.finalRating = appraisal.totalScore as any;
                } catch (err) {
                  // ignore
                }
              }
            } catch (err) {
              console.error('[PerformanceService] resolveDispute - failed to update employee profile after adjustment', { err: err?.message });
            }

            // record adjustment audit if auditService is available
            try {
              if (this.auditService) {
                await this.auditService.recordAdjustment({
                  disputeId: dispute._id?.toString(),
                  appraisalId: appraisal._id?.toString(),
                  adjustedByEmployeeId: hrManagerEmployeeId,
                  before: beforeSnapshot,
                  after: afterSnapshot,
                  reason: resolveDto.resolutionSummary,
                });
              }
            } catch (err) {
              console.error('[PerformanceService] resolveDispute - failed to record adjustment audit', { err: err?.message });
            }
          }
        }
      } catch (err) {
        console.error('[PerformanceService] resolveDispute - failed to apply adjustments', { err: err?.message });
      }
    }

    return await dispute.save();
  }

  // ========== PHASE 5: CLOSURE AND ARCHIVING ==========

  /**
   * Archive appraisal records
   */
  async archiveAppraisalRecords(cycleId: string): Promise<number> {
    const result = await this.appraisalRecordModel.updateMany(
      {
        cycleId: new Types.ObjectId(cycleId),
        status: AppraisalRecordStatus.HR_PUBLISHED,
      },
      {
        status: AppraisalRecordStatus.ARCHIVED,
        archivedAt: new Date(),
      },
    );

    // Archive the cycle
    await this.appraisalCycleModel.updateOne(
      { _id: new Types.ObjectId(cycleId) },
      { status: AppraisalCycleStatus.ARCHIVED },
    );

    return result.modifiedCount;
  }

  /**
   * Get appraisal history for an employee
   */
  async getAppraisalHistory(employeeId: string): Promise<AppraisalRecord[]> {
    return await this.appraisalRecordModel
      .find({ employeeProfileId: new Types.ObjectId(employeeId) })
      .populate('cycleId')
      .populate('templateId')
      .populate('managerProfileId')
      .sort({ managerSubmittedAt: -1 })
      .exec();
  }

  /**
   * Get performance trends (multi-cycle analysis)
   */
  async getPerformanceTrends(employeeId: string): Promise<any> {
    const history = await this.appraisalRecordModel
      .find({
        employeeProfileId: new Types.ObjectId(employeeId),
        status: { $in: [AppraisalRecordStatus.HR_PUBLISHED, AppraisalRecordStatus.ARCHIVED] },
      })
      .populate('cycleId', 'name startDate endDate')
      .sort({ managerSubmittedAt: 1 })
      .exec();

    return history.map(record => ({
      cycle: record.cycleId,
      totalScore: record.totalScore,
      overallRating: record.overallRatingLabel,
      submittedAt: record.managerSubmittedAt,
      publishedAt: record.hrPublishedAt,
    }));
  }

  /**
   * REQ-AE-10: HR Manager Dashboard
   * Get consolidated dashboard tracking appraisal completion across departments
   */
  async getHRManagerDashboard(cycleId?: string): Promise<any> {
    const matchQuery: any = {};
    if (cycleId) {
      matchQuery.cycleId = new Types.ObjectId(cycleId);
    }

    const assignments = await this.appraisalAssignmentModel
      .find(matchQuery)
      .populate('cycleId', 'name startDate endDate status')
      .populate('departmentId', 'name code')
      .populate('employeeProfileId', 'firstName lastName employeeNumber')
      .populate('managerProfileId', 'firstName lastName')
      .populate('templateId', 'name')
      .exec();

    const cycles = await this.appraisalCycleModel
      .find(cycleId ? { _id: new Types.ObjectId(cycleId) } : {})
      .sort({ startDate: -1 })
      .limit(10)
      .exec();

    // Group by department
    const departmentStats = assignments.reduce((acc, assignment) => {
      const deptId = (assignment.departmentId as any)._id.toString();
      const deptName = (assignment.departmentId as any).name;
      
      if (!acc[deptId]) {
        acc[deptId] = {
          departmentId: deptId,
          departmentName: deptName,
          total: 0,
          notStarted: 0,
          inProgress: 0,
          submitted: 0,
          published: 0,
        };
      }

      acc[deptId].total++;
      if (assignment.status === AppraisalAssignmentStatus.NOT_STARTED) acc[deptId].notStarted++;
      if (assignment.status === AppraisalAssignmentStatus.IN_PROGRESS) acc[deptId].inProgress++;
      if (assignment.status === AppraisalAssignmentStatus.SUBMITTED) acc[deptId].submitted++;
      if (assignment.status === AppraisalAssignmentStatus.PUBLISHED) acc[deptId].published++;

      return acc;
    }, {});

    // Overall stats
    const overall = {
      total: assignments.length,
      notStarted: assignments.filter(a => a.status === AppraisalAssignmentStatus.NOT_STARTED).length,
      inProgress: assignments.filter(a => a.status === AppraisalAssignmentStatus.IN_PROGRESS).length,
      submitted: assignments.filter(a => a.status === AppraisalAssignmentStatus.SUBMITTED).length,
      published: assignments.filter(a => a.status === AppraisalAssignmentStatus.PUBLISHED).length,
    };

    return {
      cycles,
      overall,
      departmentStats: Object.values(departmentStats),
      assignments,
    };
  }

  /**
   * REQ-PP-13, REQ-AE-03: Line Manager Dashboard
   * Get assigned appraisals for manager's direct reports
   */
  async getManagerDashboard(managerId: string): Promise<any> {
    const assignments = await this.appraisalAssignmentModel
      .find({ managerProfileId: new Types.ObjectId(managerId) })
      .populate('cycleId', 'name startDate endDate status managerDueDate')
      .populate('employeeProfileId', 'firstName lastName employeeNumber')
      .populate('departmentId', 'name')
      .populate('positionId', 'title')
      .populate('templateId', 'name ratingScale')
      .populate('latestAppraisalId')
      .sort({ assignedAt: -1 })
      .exec();

    const activeCycles = await this.appraisalCycleModel
      .find({ status: AppraisalCycleStatus.ACTIVE })
      .sort({ startDate: -1 })
      .limit(5)
      .lean()
      .exec();

    const stats = {
      total: assignments.length,
      notStarted: assignments.filter(a => a.status === AppraisalAssignmentStatus.NOT_STARTED).length,
      inProgress: assignments.filter(a => a.status === AppraisalAssignmentStatus.IN_PROGRESS).length,
      completed: assignments.filter(a => a.status === AppraisalAssignmentStatus.SUBMITTED).length,
      overdue: assignments.filter(a => 
        a.dueDate && new Date(a.dueDate) < new Date() && 
        a.status !== AppraisalAssignmentStatus.SUBMITTED &&
        a.status !== AppraisalAssignmentStatus.PUBLISHED
      ).length,
    };

    // Debug info removed in production

    return {
      activeCycles,
      assignments,
      stats,
    };
  }

  /**
   * REQ-PP-13: Get Manager's Team Overview
   */
  async getManagerTeam(managerId: string) {
    // Fetch the manager's department ID
    const manager = await this.employeeProfileModel.findById(managerId).select('primaryDepartmentId');
    if (!manager || !manager.primaryDepartmentId) {
        throw new NotFoundException('Manager or their department not found');
    }

    // Fetch all employees in the same department
    const employees = await this.employeeProfileModel
        .find({ primaryDepartmentId: manager.primaryDepartmentId })
        .select('firstName lastName employeeNumber email phoneNumber')
        .exec();

    // Fetch assignments for employees in the department
    const assignments = await this.appraisalAssignmentModel
        .find({ employeeProfileId: { $in: employees.map(emp => emp._id) } })
        .populate('cycleId', 'name startDate endDate')
        .populate('templateId', 'name')
        .populate('latestAppraisalId')
        .sort({ assignedAt: -1 })
        .exec();

    // Map employees to their assignments
    const employeeMap = new Map();
    employees.forEach(employee => {
        employeeMap.set(employee._id.toString(), {
            employee,
            assignments: [],
            latestCycle: null,
            totalAppraisals: 0,
            completedAppraisals: 0,
        });
    });

    assignments.forEach(assignment => {
        const empId = assignment.employeeProfileId.toString();
        const empData = employeeMap.get(empId);
        if (empData) {
            empData.assignments.push(assignment);
            empData.totalAppraisals++;
            if (assignment.status === AppraisalAssignmentStatus.PUBLISHED) {
                empData.completedAppraisals++;
            }
            if (!empData.latestCycle || new Date(assignment.assignedAt) > new Date(empData.latestCycle.assignedAt)) {
                empData.latestCycle = assignment;
            }
        }
    });

    const teamMembers = Array.from(employeeMap.values());

    return {
        totalMembers: teamMembers.length,
        teamMembers,
        totalAssignments: assignments.length,
    };
}

  /**
   * REQ-OD-06, REQ-OD-08: Performance Reports and Analytics
   */
  async getPerformanceReports(cycleId?: string, departmentId?: string) {
    const query: any = {};
    if (cycleId) query.cycleId = new Types.ObjectId(cycleId);
    if (departmentId) query.departmentId = new Types.ObjectId(departmentId);

    const assignments = await this.appraisalAssignmentModel
      .find(query)
      .populate('employeeProfileId', 'firstName lastName employeeNumber')
      .populate('cycleId', 'name startDate endDate')
      .populate('departmentId', 'name')
      .populate('latestAppraisalId')
      .exec();

    const records = await this.appraisalRecordModel
      .find(query)
      .populate('employeeProfileId', 'firstName lastName')
      .exec();

    // Calculate statistics
    const totalAssignments = assignments.length;
    const completedAssignments = assignments.filter(a => a.status === AppraisalAssignmentStatus.PUBLISHED).length;
    const averageScore = records.length > 0
      ? records.reduce((sum, r) => sum + (r.totalScore || 0), 0) / records.length
      : 0;

    // Rating distribution
    const ratingDistribution = {
      excellent: 0,
      good: 0,
      satisfactory: 0,
      needsImprovement: 0,
      unsatisfactory: 0,
    };

    records.forEach(record => {
      const label = record.overallRatingLabel?.toLowerCase() || '';
      if (label.includes('excellent') || label.includes('outstanding')) ratingDistribution.excellent++;
      else if (label.includes('good') || label.includes('above')) ratingDistribution.good++;
      else if (label.includes('satisfactory') || label.includes('meets')) ratingDistribution.satisfactory++;
      else if (label.includes('needs') || label.includes('below')) ratingDistribution.needsImprovement++;
      else ratingDistribution.unsatisfactory++;
    });

    // Department breakdown
    const departmentStats = assignments.reduce((acc, assignment) => {
      const dept = assignment.departmentId as any;
      const deptId = dept?._id?.toString() || 'unassigned';
      const deptName = dept?.name || 'Unassigned';
      
      if (!acc[deptId]) {
        acc[deptId] = {
          departmentId: deptId,
          departmentName: deptName,
          total: 0,
          completed: 0,
          averageScore: 0,
          scores: [],
        };
      }
      
      acc[deptId].total++;
      if (assignment.status === AppraisalAssignmentStatus.PUBLISHED) {
        acc[deptId].completed++;
        const record = records.find(r => r._id.toString() === assignment.latestAppraisalId?.toString());
        if (record?.totalScore) {
          acc[deptId].scores.push(record.totalScore);
        }
      }
      
      return acc;
    }, {});

    // Calculate average scores per department
    Object.values(departmentStats).forEach((dept: any) => {
      if (dept.scores.length > 0) {
        dept.averageScore = dept.scores.reduce((sum, score) => sum + score, 0) / dept.scores.length;
      }
      delete dept.scores;
    });

    // Cycle performance trends
    const cycles = await this.appraisalCycleModel
      .find({})
      .sort({ startDate: -1 })
      .limit(10)
      .exec();

    const cycleTrends = await Promise.all(
      cycles.map(async (cycle) => {
        const cycleAssignments = await this.appraisalAssignmentModel
          .find({ cycleId: cycle._id })
          .exec();
        
        const cycleRecords = await this.appraisalRecordModel
          .find({ cycleId: cycle._id })
          .exec();

        return {
          cycleId: cycle._id,
          cycleName: cycle.name,
          startDate: cycle.startDate,
          endDate: cycle.endDate,
          totalAssignments: cycleAssignments.length,
          completedAssignments: cycleAssignments.filter(a => a.status === AppraisalAssignmentStatus.PUBLISHED).length,
          averageScore: cycleRecords.length > 0
            ? cycleRecords.reduce((sum, r) => sum + (r.totalScore || 0), 0) / cycleRecords.length
            : 0,
        };
      })
    );

    return {
      summary: {
        totalAssignments,
        completedAssignments,
        completionRate: totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0,
        averageScore,
      },
      ratingDistribution,
      departmentStats: Object.values(departmentStats),
      cycleTrends,
      recentAppraisals: records.slice(0, 20),
    };
  }

  /**
   * REQ-AE-06: Send reminders to managers for pending appraisals
   * Phase 2: Evaluation and Review - Monitor progress and send reminders
   */
  async sendAppraisalReminders(
    hrEmployeeId: string,
    cycleId?: string,
    departmentId?: string,
    assignmentIds?: string[],
  ): Promise<{ sent: number; failed: number; recipients: any[] }> {
    const filter: any = {
      status: { $in: [AppraisalAssignmentStatus.NOT_STARTED, AppraisalAssignmentStatus.IN_PROGRESS] },
    };

    if (cycleId) filter.cycleId = new Types.ObjectId(cycleId);
    if (departmentId) filter.departmentId = new Types.ObjectId(departmentId);
    if (assignmentIds && assignmentIds.length > 0) {
      filter._id = { $in: assignmentIds.map(id => new Types.ObjectId(id)) };
    }

    const assignments = await this.appraisalAssignmentModel
      .find(filter)
      .populate('managerProfileId', 'firstName lastName email')
      .populate('employeeProfileId', 'firstName lastName employeeNumber')
      .populate('cycleId', 'name endDate managerDueDate')
      .exec();

    // Group by manager to send consolidated reminders
    const managerMap = new Map();
    assignments.forEach(assignment => {
      const managerId = (assignment.managerProfileId as any)._id.toString();
      if (!managerMap.has(managerId)) {
        managerMap.set(managerId, {
          manager: assignment.managerProfileId,
          pendingAppraisals: [],
        });
      }
      managerMap.get(managerId).pendingAppraisals.push({
        employeeName: `${(assignment.employeeProfileId as any).firstName} ${(assignment.employeeProfileId as any).lastName}`,
        employeeNumber: (assignment.employeeProfileId as any).employeeNumber,
        cycleName: (assignment.cycleId as any).name,
        dueDate: assignment.dueDate || (assignment.cycleId as any).managerDueDate,
        status: assignment.status,
      });
    });

    const recipients: Array<{
      managerId: string;
      managerName: string;
      managerEmail: string;
      pendingCount: number;
      appraisals: any[];
    }> = [];
    let sent = 0;
    let failed = 0;

    // TODO: Integrate with actual notification service
    // For now, we'll just log the reminders and return the data
    for (const [managerId, data] of managerMap) {
      try {
        // In production, send email/notification here
        
        recipients.push({
          managerId,
          managerName: `${data.manager.firstName} ${data.manager.lastName}`,
          managerEmail: data.manager.email,
          pendingCount: data.pendingAppraisals.length,
          appraisals: data.pendingAppraisals,
        });
        sent++;
      } catch (error) {
        console.error(`Failed to send reminder to manager ${managerId}:`, error);
        failed++;
      }
    }

    return { sent, failed, recipients };
  }

  /**
   * REQ-OD-05, Phase 5: Get archived appraisal records
   * Closure and Archiving - Access historical records for reference and analysis
   */
  async getArchivedRecords(
    cycleId?: string,
    employeeId?: string,
    departmentId?: string,
  ): Promise<AppraisalRecord[]> {
    const filter: any = {
      status: AppraisalRecordStatus.ARCHIVED,
    };

    if (cycleId) filter.cycleId = new Types.ObjectId(cycleId);
    if (employeeId) filter.employeeProfileId = new Types.ObjectId(employeeId);
    if (departmentId) {
      // Get assignments for the department first
      const assignments = await this.appraisalAssignmentModel
        .find({ departmentId: new Types.ObjectId(departmentId) })
        .select('_id')
        .exec();
      filter.assignmentId = { $in: assignments.map(a => a._id) };
    }

    return await this.appraisalRecordModel
      .find(filter)
      .populate('cycleId', 'name startDate endDate cycleType')
      .populate('templateId', 'name ratingScale')
      .populate('employeeProfileId', 'firstName lastName employeeNumber')
      .populate('managerProfileId', 'firstName lastName')
      .populate('assignmentId')
      .sort({ archivedAt: -1 })
      .exec();
  }

  /**
   * REQ-AE-03, Phase 2: Get attendance context for appraisal
   * Integration with Time Management Module - Attendance and punctuality inform assessment
   */
  async getAttendanceContext(
    employeeId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any> {
    // Set default date range if not provided (last 6 months or current cycle period)
    if (!endDate) endDate = new Date();
    if (!startDate) {
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 6);
    }

    // TODO: When TimeManagementModule is integrated, fetch actual attendance data
    // For now, return a placeholder structure that managers can reference
    return {
      employeeId,
      period: { startDate, endDate },
      summary: {
        totalWorkDays: 0,
        presentDays: 0,
        absentDays: 0,
        lateDays: 0,
        overtimeDays: 0,
        attendanceRate: 0,
        punctualityRate: 0,
      },
      notes: 'Attendance data integration pending. Please manually review Time Management records.',
      integrationStatus: 'PENDING',
      // When integrated, this will include:
      // - Detailed attendance records
      // - Lateness patterns
      // - Overtime hours
      // - Leave balances
      // - Attendance trend analysis
    };
  }

  /**
   * Helper: determine whether a manager employee id corresponds to the
   * head of the given department (by comparing primaryPositionId to
   * department.headPositionId). Returns false if department or manager
   * information is missing.
   */
  private async isDepartmentHead(managerEmployeeId: string, departmentId: any): Promise<boolean> {
    try {
      if (!departmentId) return false;
      // Normalize departmentId
      const deptId = (departmentId && typeof departmentId === 'object' && departmentId._id) ? departmentId._id : departmentId;
      const department = await this.departmentModel.findById(deptId).select('headPositionId').lean();
      if (!department || !(department as any).headPositionId) return false;

      const manager = await this.employeeProfileModel.findById(managerEmployeeId).select('primaryPositionId').lean();
      if (!manager || !(manager as any).primaryPositionId) return false;

      const headPos = (department as any).headPositionId?._id || (department as any).headPositionId;
      const mgrPos = (manager as any).primaryPositionId?._id || (manager as any).primaryPositionId;

      try {
        return String(headPos) === String(mgrPos);
      } catch (err) {
        return false;
      }
    } catch (err) {
      return false;
    }
  }
}

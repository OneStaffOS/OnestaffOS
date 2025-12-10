import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Department } from './models/department.schema';
import { Position } from './models/position.schema';
import { PositionAssignment } from './models/position-assignment.schema';
import { StructureChangeRequest } from './models/structure-change-request.schema';
import { StructureApproval } from './models/structure-approval.schema';
import { StructureChangeLog } from './models/structure-change-log.schema';
import { EmployeeProfile } from '../employee-profile/models/employee-profile.schema';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { CreateChangeRequestDto } from './dto/create-change-request.dto';
import { ProcessApprovalDto } from './dto/process-approval.dto';
import { CreatePositionAssignmentDto } from './dto/create-position-assignment.dto';
import { AssignDepartmentManagerDto } from './dto/assign-department-manager.dto';
import {
  StructureRequestStatus,
  ApprovalDecision,
  ChangeLogAction,
  StructureRequestType,
} from './enums/organization-structure.enums';

@Injectable()
export class OrganizationStructureService {
  constructor(
    @InjectModel(Department.name)
    private departmentModel: Model<Department>,
    @InjectModel(Position.name)
    private positionModel: Model<Position>,
    @InjectModel(PositionAssignment.name)
    private positionAssignmentModel: Model<PositionAssignment>,
    @InjectModel(StructureChangeRequest.name)
    private changeRequestModel: Model<StructureChangeRequest>,
    @InjectModel(StructureApproval.name)
    private approvalModel: Model<StructureApproval>,
    @InjectModel(StructureChangeLog.name)
    private changeLogModel: Model<StructureChangeLog>,
    @InjectModel(EmployeeProfile.name)
    private employeeProfileModel: Model<EmployeeProfile>,
  ) {}

  // ========== DEPARTMENT MANAGEMENT ==========

  /**
   * REQ-OSM-01: Create a new department (System Admin)
   */
  async createDepartment(createDto: CreateDepartmentDto, performedBy: string): Promise<Department> {
    // Check if department code already exists
    const existingDept = await this.departmentModel.findOne({ code: createDto.code });
    if (existingDept) {
      throw new BadRequestException('Department code already exists');
    }

    const department = new this.departmentModel({
      code: createDto.code,
      name: createDto.name,
      description: createDto.description,
      headPositionId: createDto.headPositionId ? new Types.ObjectId(createDto.headPositionId) : undefined,
      isActive: createDto.isActive !== undefined ? createDto.isActive : true,
    });

    const saved = await department.save();

    // Log the creation
    await this.logChange(
      ChangeLogAction.CREATED,
      'Department',
      saved._id as Types.ObjectId,
      performedBy,
      `Created department: ${saved.name}`,
      null,
      saved.toObject(),
    );

    return saved;
  }

  /**
   * REQ-OSM-02: Update an existing department (System Admin)
   */
  async updateDepartment(
    departmentId: string,
    updateDto: UpdateDepartmentDto,
    performedBy: string,
  ): Promise<Department> {
    const department = await this.departmentModel.findById(departmentId);
    if (!department) {
      throw new NotFoundException('Department not found');
    }

    // Check for code uniqueness if code is being updated
    if (updateDto.code && updateDto.code !== department.code) {
      const existingDept = await this.departmentModel.findOne({ code: updateDto.code });
      if (existingDept) {
        throw new BadRequestException('Department code already exists');
      }
    }

    const beforeSnapshot = department.toObject();

    // Update fields
    if (updateDto.code) department.code = updateDto.code;
    if (updateDto.name) department.name = updateDto.name;
    if (updateDto.description !== undefined) department.description = updateDto.description;
    if (updateDto.headPositionId !== undefined) {
      department.headPositionId = updateDto.headPositionId ? new Types.ObjectId(updateDto.headPositionId) : undefined;
    }
    if (updateDto.isActive !== undefined) department.isActive = updateDto.isActive;

    const saved = await department.save();

    // Log the update
    await this.logChange(
      ChangeLogAction.UPDATED,
      'Department',
      saved._id as Types.ObjectId,
      performedBy,
      `Updated department: ${saved.name}`,
      beforeSnapshot,
      saved.toObject(),
    );

    return saved;
  }

  /**
   * Assign a manager to a department
   */
  async assignDepartmentManager(
    departmentId: string,
    assignDto: AssignDepartmentManagerDto,
    performedBy: string,
  ): Promise<Department> {
    const department = await this.departmentModel.findById(departmentId);
    if (!department) {
      throw new NotFoundException('Department not found');
    }

    // Verify position exists
    const position = await this.positionModel.findById(assignDto.headPositionId);
    if (!position) {
      throw new NotFoundException('Position not found');
    }

    const beforeSnapshot = department.toObject();

    department.headPositionId = new Types.ObjectId(assignDto.headPositionId);
    const saved = await department.save();

    // Log the update
    await this.logChange(
      ChangeLogAction.UPDATED,
      'Department',
      saved._id as Types.ObjectId,
      performedBy,
      `Assigned manager to department: ${saved.name}`,
      beforeSnapshot,
      saved.toObject(),
    );

    return saved;
  }

  /**
   * Get all departments
   */
  async getAllDepartments(includeInactive: boolean = false): Promise<Department[]> {
    const filter = includeInactive ? {} : { isActive: true };
    return await this.departmentModel
      .find(filter)
      .populate('headPositionId')
      .exec();
  }

  /**
   * Get department by ID
   */
  async getDepartmentById(departmentId: any): Promise<Department> {
    // Normalize incoming departmentId and validate below

    // Normalize departmentId in case callers pass an object instead of a string
    let idToUse: string | null = null;
    if (!departmentId) {
      throw new BadRequestException('Department id is required');
    }

    if (typeof departmentId === 'string') {
      idToUse = departmentId;
    } else if ((departmentId as any)?._id) {
      idToUse = String((departmentId as any)._id);
    } else if ((departmentId as any)?.id) {
      idToUse = String((departmentId as any).id);
    } else if (Types.ObjectId.isValid(departmentId)) {
      idToUse = String(departmentId);
    } else {
      // Fallback: attempt to stringify, but validate below
      idToUse = String(departmentId);
    }

    if (!Types.ObjectId.isValid(idToUse)) {
      throw new BadRequestException('Invalid department id');
    }

    const department = await this.departmentModel
      .findById(idToUse)
      .populate('headPositionId')
      .exec();

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    return department;
  }

  /**
   * REQ-OSM-05: Deactivate department (System Admin)
   */
  async deactivateDepartment(departmentId: string, performedBy: string): Promise<Department> {
    const department = await this.departmentModel.findById(departmentId);
    if (!department) {
      throw new NotFoundException('Department not found');
    }

    const beforeSnapshot = department.toObject();
    department.isActive = false;

    const saved = await department.save();

    // Log the deactivation
    await this.logChange(
      ChangeLogAction.DEACTIVATED,
      'Department',
      saved._id as Types.ObjectId,
      performedBy,
      `Deactivated department: ${saved.name}`,
      beforeSnapshot,
      saved.toObject(),
    );

    return saved;
  }

  async reactivateDepartment(departmentId: string, performedBy: string): Promise<Department> {
    const department = await this.departmentModel.findById(departmentId);
    if (!department) {
      throw new NotFoundException('Department not found');
    }

    const beforeSnapshot = department.toObject();
    department.isActive = true;

    const saved = await department.save();

    // Log the reactivation
    await this.logChange(
      ChangeLogAction.UPDATED,
      'Department',
      saved._id as Types.ObjectId,
      performedBy,
      `Reactivated department: ${saved.name}`,
      beforeSnapshot,
      saved.toObject(),
    );

    return saved;
  }

  // ========== POSITION MANAGEMENT ==========

  /**
   * REQ-OSM-01: Create a new position (System Admin)
   */
  async createPosition(createDto: CreatePositionDto, performedBy: string): Promise<Position> {
    // Check if position code already exists
    const existingPosition = await this.positionModel.findOne({ code: createDto.code });
    if (existingPosition) {
      throw new BadRequestException('Position code already exists');
    }

    // Verify department exists
    const department = await this.departmentModel.findById(createDto.departmentId);
    if (!department) {
      throw new NotFoundException('Department not found');
    }

    // Verify reporting position if provided
    if (createDto.reportsToPositionId) {
      const reportingPosition = await this.positionModel.findById(createDto.reportsToPositionId);
      if (!reportingPosition) {
        throw new NotFoundException('Reporting position not found');
      }
    }

    const position = new this.positionModel({
      code: createDto.code,
      title: createDto.title,
      description: createDto.description,
      departmentId: new Types.ObjectId(createDto.departmentId),
      reportsToPositionId: createDto.reportsToPositionId ? new Types.ObjectId(createDto.reportsToPositionId) : undefined, // Ensure undefined if not provided
      isActive: createDto.isActive !== undefined ? createDto.isActive : true,
    });

    const saved = await position.save();

    // Log the creation
    await this.logChange(
      ChangeLogAction.CREATED,
      'Position',
      saved._id as Types.ObjectId,
      performedBy,
      `Created position: ${saved.title}`,
      null,
      saved.toObject(),
    );

    return saved;
  }

  /**
   * REQ-OSM-02: Update an existing position (System Admin)
   */
  async updatePosition(
    positionId: string,
    updateDto: UpdatePositionDto,
    performedBy: string,
  ): Promise<Position> {
    const position = await this.positionModel.findById(positionId);
    if (!position) {
      throw new NotFoundException('Position not found');
    }

    // Check for code uniqueness if code is being updated
    if (updateDto.code && updateDto.code !== position.code) {
      const existingPosition = await this.positionModel.findOne({ code: updateDto.code });
      if (existingPosition) {
        throw new BadRequestException('Position code already exists');
      }
    }

    // Verify department if being updated
    if (updateDto.departmentId) {
      const department = await this.departmentModel.findById(updateDto.departmentId);
      if (!department) {
        throw new NotFoundException('Department not found');
      }
    }

    // Verify reporting position and prevent circular reporting
    if (updateDto.reportsToPositionId) {
      if (updateDto.reportsToPositionId === positionId) {
        throw new BadRequestException('Position cannot report to itself');
      }

      const reportingPosition = await this.positionModel.findById(updateDto.reportsToPositionId);
      if (!reportingPosition) {
        throw new NotFoundException('Reporting position not found');
      }

      const isDirectReversal = reportingPosition.reportsToPositionId?.toString() === positionId.toString();

      if (!isDirectReversal) {
        const isCircular = await this.checkCircularReporting(
          positionId,
          updateDto.reportsToPositionId,
        );
        if (isCircular) {
          const currentPosition = await this.positionModel.findById(positionId).select('title');
          const targetPosition = await this.positionModel.findById(updateDto.reportsToPositionId).select('title');
          throw new BadRequestException(
            `Circular reporting structure detected: ${currentPosition?.title || 'Position'} cannot report to ${targetPosition?.title || 'Position'} as it would create a circular reference`
          );
        }
      } else {
        reportingPosition.reportsToPositionId = undefined; // Clear the circular reference
        await reportingPosition.save();
      }
    }

    const beforeSnapshot = position.toObject();

    // Update fields
    if (updateDto.code) {
      position.code = updateDto.code;
    }
    if (updateDto.title) {
      position.title = updateDto.title;
    }
    if (updateDto.description !== undefined) {
      position.description = updateDto.description;
    }
    if (updateDto.departmentId) {
      position.departmentId = new Types.ObjectId(updateDto.departmentId);
    }
    if (updateDto.reportsToPositionId !== undefined) {
      position.reportsToPositionId = updateDto.reportsToPositionId
        ? new Types.ObjectId(updateDto.reportsToPositionId)
        : undefined; // Ensure undefined if not provided
    }
    if (updateDto.isActive !== undefined) {
      position.isActive = updateDto.isActive;
    }

    const saved = await position.save();

    // Log the update
    await this.logChange(
      ChangeLogAction.UPDATED,
      'Position',
      saved._id as Types.ObjectId,
      performedBy,
      `Updated position: ${saved.title}`,
      beforeSnapshot,
      saved.toObject(),
    );

    // Bypass schema hooks to ensure reportsToPositionId is not overridden
    await this.positionModel.updateOne(
      { _id: positionId },
      { reportsToPositionId: updateDto.reportsToPositionId ? new Types.ObjectId(updateDto.reportsToPositionId) : undefined },
    );

    return saved;
  }

  /**
   * Get all positions
   */
  async getAllPositions(includeInactive: boolean = false): Promise<Position[]> {
    const filter = includeInactive ? {} : { isActive: true };
    return await this.positionModel
      .find(filter)
      .populate('departmentId')
      .populate('reportsToPositionId')
      .exec();
  }

  /**
   * Get position by ID
   */
  async getPositionById(positionId: string): Promise<Position> {
    const position = await this.positionModel
      .findById(positionId)
      .populate('departmentId')
      .populate('reportsToPositionId')
      .exec();

    if (!position) {
      throw new NotFoundException('Position not found');
    }

    return position;
  }

  /**
   * Get positions by department
   */
  async getPositionsByDepartment(departmentId: string): Promise<Position[]> {
    return await this.positionModel
      .find({ departmentId: new Types.ObjectId(departmentId), isActive: true })
      .populate('reportsToPositionId')
      .exec();
  }

  /**
   * REQ-OSM-05: Deactivate/Close position (System Admin)
   * BR 12: Positions with historical assignments can only be delimited, not deleted
   */
  async deactivatePosition(positionId: string, performedBy: string): Promise<Position> {
    const position = await this.positionModel.findById(positionId);
    if (!position) {
      throw new NotFoundException('Position not found');
    }

    // Check if position has historical assignments
    const hasAssignments = await this.positionAssignmentModel.exists({ positionId: new Types.ObjectId(positionId) });
    
    if (hasAssignments) {
      // BR 12: Position can only be delimited (deactivated), not deleted
      const beforeSnapshot = position.toObject();
      position.isActive = false;

      const saved = await position.save();

      // End any active assignments
      await this.positionAssignmentModel.updateMany(
        { positionId: new Types.ObjectId(positionId), endDate: null },
        { endDate: new Date() },
      );

      // Log the deactivation
      await this.logChange(
        ChangeLogAction.DEACTIVATED,
        'Position',
        saved._id as Types.ObjectId,
        performedBy,
        `Delimited position: ${saved.title} (has historical assignments)`,
        beforeSnapshot,
        saved.toObject(),
      );

      return saved;
    } else {
      // No assignments, can fully deactivate
      const beforeSnapshot = position.toObject();
      position.isActive = false;

      const saved = await position.save();

      // Log the deactivation
      await this.logChange(
        ChangeLogAction.DEACTIVATED,
        'Position',
        saved._id as Types.ObjectId,
        performedBy,
        `Deactivated position: ${saved.title}`,
        beforeSnapshot,
        saved.toObject(),
      );

      return saved;
    }
  }

  // ========== ORGANIZATIONAL HIERARCHY / VISIBILITY ==========

  /**
   * REQ-SANV-01: View organizational hierarchy (Employee)
   */
  async getOrganizationalHierarchy(): Promise<any> {
    const departments = await this.departmentModel
      .find({ isActive: true })
      .populate('headPositionId')
      .exec();

    const positions = await this.positionModel
      .find({ isActive: true })
      .populate('departmentId')
      .populate('reportsToPositionId')
      .exec();

    // Build hierarchical structure
    return {
      departments: departments.map(dept => ({
        id: dept._id,
        code: dept.code,
        name: dept.name,
        description: dept.description,
        headPosition: dept.headPositionId,
        positions: positions
          .filter(pos => pos.departmentId && (pos.departmentId as any)._id.equals(dept._id))
          .map(pos => ({
            id: pos._id,
            code: pos.code,
            title: pos.title,
            description: pos.description,
            reportsTo: pos.reportsToPositionId,
          })),
      })),
    };
  }

  /**
   * BR 41: Get employee's own department hierarchy
   */
  async getEmployeeHierarchy(employeeProfileId: string): Promise<any> {
    // Find employee's current assignment
    const assignment = await this.positionAssignmentModel
      .findOne({ 
        employeeProfileId: new Types.ObjectId(employeeProfileId),
        endDate: null 
      })
      .populate('departmentId')
      .populate('positionId')
      .exec();

    if (!assignment) {
      // Employee has no assignment, return empty structure
      return { departments: [] };
    }

    const departmentId = (assignment.departmentId as any)._id;

    // Get the employee's department
    const department = await this.departmentModel
      .findById(departmentId)
      .populate('headPositionId')
      .exec();

    if (!department) {
      return { departments: [] };
    }

    // Get all positions in the employee's department
    const positions = await this.positionModel
      .find({ departmentId: departmentId, isActive: true })
      .populate('departmentId')
      .populate('reportsToPositionId')
      .exec();

    // Return only the employee's department structure
    return {
      departments: [{
        id: department._id,
        code: department.code,
        name: department.name,
        description: department.description,
        headPosition: department.headPositionId,
        positions: positions.map(pos => ({
          id: pos._id,
          code: pos.code,
          title: pos.title,
          description: pos.description,
          reportsTo: pos.reportsToPositionId,
        })),
      }],
    };
  }

  /**
   * REQ-SANV-02: View team structure (Manager)
   */
  async getTeamStructure(managerPositionId: string): Promise<Position[]> {
    const teamPositions = await this.positionModel
      .find({
        reportsToPositionId: new Types.ObjectId(managerPositionId),
        isActive: true,
      })
      .populate('departmentId')
      .exec();

    return teamPositions;
  }

  // ========== POSITION ASSIGNMENT MANAGEMENT ==========

  /**
   * Get all position assignments
   */
  async getAllAssignments(): Promise<PositionAssignment[]> {
    return this.positionAssignmentModel
      .find()
      .populate('employeeProfileId')
      .populate('positionId')
      .populate('departmentId')
      .sort({ startDate: -1 })
      .exec();
  }

  /**
   * Assign an employee to a position
   */
  async assignEmployeeToPosition(createDto: CreatePositionAssignmentDto): Promise<PositionAssignment> {
    // Verify position and department exist
    const position = await this.positionModel.findById(createDto.positionId);
    if (!position) {
      throw new NotFoundException('Position not found');
    }

    const department = await this.departmentModel.findById(createDto.departmentId);
    if (!department) {
      throw new NotFoundException('Department not found');
    }

    // End any existing active assignments for this employee
    await this.positionAssignmentModel.updateMany(
      { employeeProfileId: new Types.ObjectId(createDto.employeeProfileId), endDate: null },
      { endDate: new Date() },
    );

    const assignment = new this.positionAssignmentModel({
      employeeProfileId: new Types.ObjectId(createDto.employeeProfileId),
      positionId: new Types.ObjectId(createDto.positionId),
      departmentId: new Types.ObjectId(createDto.departmentId),
      startDate: createDto.startDate,
      endDate: createDto.endDate,
      reason: createDto.reason,
      notes: createDto.notes,
    });

    return await assignment.save();
  }

  /**
   * Remove employee from position (end assignment)
   */
  async removeEmployeeFromPosition(assignmentId: string): Promise<PositionAssignment> {
    const assignment = await this.positionAssignmentModel.findById(assignmentId);
    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    if (assignment.endDate) {
      throw new BadRequestException('Assignment already ended');
    }

    assignment.endDate = new Date();
    return await assignment.save();
  }

  /**
   * Get position assignments for an employee
   */
  async getEmployeeAssignments(employeeId: string): Promise<PositionAssignment[]> {
    return await this.positionAssignmentModel
      .find({ employeeProfileId: new Types.ObjectId(employeeId) })
      .populate('positionId')
      .populate('departmentId')
      .sort({ startDate: -1 })
      .exec();
  }

  /**
   * Get current assignment for an employee
   */
  async getCurrentAssignment(employeeId: string): Promise<PositionAssignment | null> {
    return await this.positionAssignmentModel
      .findOne({
        employeeProfileId: new Types.ObjectId(employeeId),
        endDate: null,
      })
      .populate('positionId')
      .populate('departmentId')
      .exec();
  }

  // ========== CHANGE REQUEST MANAGEMENT ==========

  /**
   * REQ-OSM-03: Submit change request (Manager)
   */
  async createChangeRequest(
    createDto: CreateChangeRequestDto,
    requestedBy: string,
  ): Promise<StructureChangeRequest> {
    // Generate unique request number
    const requestNumber = `SCR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const changeRequest = new this.changeRequestModel({
      _id: new Types.ObjectId(),
      requestNumber,
      requestedByEmployeeId: new Types.ObjectId(requestedBy),
      requestType: createDto.requestType,
      targetDepartmentId: createDto.targetDepartmentId ? new Types.ObjectId(createDto.targetDepartmentId) : undefined,
      targetPositionId: createDto.targetPositionId ? new Types.ObjectId(createDto.targetPositionId) : undefined,
      details: createDto.details,
      reason: createDto.reason,
      status: StructureRequestStatus.DRAFT,
    });

    return await changeRequest.save();
  }

  /**
   * Submit change request for approval
   */
  async submitChangeRequest(requestId: string, submittedBy: string): Promise<StructureChangeRequest> {
    // Ensure requestId is a valid ObjectId
    let objectId: Types.ObjectId;
    try {
      objectId = new Types.ObjectId(requestId);
    } catch (error) {
      throw new BadRequestException('Invalid request ID format');
    }

    const changeRequest = await this.changeRequestModel.findById(objectId);
    if (!changeRequest) {
      throw new NotFoundException('Change request not found');
    }

    if (changeRequest.status !== StructureRequestStatus.DRAFT) {
      throw new BadRequestException('Only draft requests can be submitted');
    }

    changeRequest.status = StructureRequestStatus.SUBMITTED;
    changeRequest.submittedByEmployeeId = new Types.ObjectId(submittedBy);
    changeRequest.submittedAt = new Date();

    return await changeRequest.save();
  }

  /**
   * Get all change requests
   */
  async getAllChangeRequests(): Promise<StructureChangeRequest[]> {
    return await this.changeRequestModel
      .find()
      .populate('requestedByEmployeeId')
      .populate('submittedByEmployeeId')
      .populate('targetDepartmentId')
      .populate('targetPositionId')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Get pending change requests
   */
  async getPendingChangeRequests(): Promise<StructureChangeRequest[]> {
    return await this.changeRequestModel
      .find({
        status: { $in: [StructureRequestStatus.SUBMITTED, StructureRequestStatus.UNDER_REVIEW] },
      })
      .populate('requestedByEmployeeId')
      .populate('submittedByEmployeeId')
      .populate('targetDepartmentId')
      .populate('targetPositionId')
      .sort({ submittedAt: -1 })
      .exec();
  }

  /**
   * Get my change requests
   */
  async getMyChangeRequests(employeeId: string): Promise<StructureChangeRequest[]> {
    return await this.changeRequestModel
      .find({ requestedByEmployeeId: new Types.ObjectId(employeeId) })
      .populate('targetDepartmentId')
      .populate('targetPositionId')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * REQ-OSM-04: Create approval record for change request (System Admin)
   */
  async createApproval(
    changeRequestId: string,
    approverEmployeeId: string,
    processDto: ProcessApprovalDto,
  ): Promise<StructureApproval> {
    const changeRequest = await this.changeRequestModel.findById(new Types.ObjectId(changeRequestId));
    if (!changeRequest) {
      throw new NotFoundException('Change request not found');
    }

    // Check if approval already exists for this approver
    const existingApproval = await this.approvalModel.findOne({
      changeRequestId: new Types.ObjectId(changeRequestId),
      approverEmployeeId: new Types.ObjectId(approverEmployeeId),
    });

    if (existingApproval) {
      // Update existing approval
      existingApproval.decision = processDto.decision;
      existingApproval.comments = processDto.comments;
      existingApproval.decidedAt = new Date();
      return await existingApproval.save();
    }

    // Create new approval
    const approval = new this.approvalModel({
      _id: new Types.ObjectId(),
      changeRequestId: new Types.ObjectId(changeRequestId),
      approverEmployeeId: new Types.ObjectId(approverEmployeeId),
      decision: processDto.decision,
      comments: processDto.comments,
      decidedAt: new Date(),
    });

    const saved = await approval.save();

    // Update change request status based on approval decision
    if (processDto.decision === ApprovalDecision.APPROVED) {
      changeRequest.status = StructureRequestStatus.APPROVED;
      await changeRequest.save();
      
      // Automatically implement the approved changes
      try {
        await this.implementChangeRequest(changeRequestId, approverEmployeeId);
      } catch (error) {
        // Log the error but don't fail the approval
        console.error('Failed to implement change request:', error);
      }
    } else if (processDto.decision === ApprovalDecision.REJECTED) {
      changeRequest.status = StructureRequestStatus.REJECTED;
      await changeRequest.save();
    }

    return saved;
  }

  /**
   * Get approvals for a change request
   */
  async getChangeRequestApprovals(changeRequestId: string): Promise<StructureApproval[]> {
    return await this.approvalModel
      .find({ changeRequestId: new Types.ObjectId(changeRequestId) })
      .populate('approverEmployeeId')
      .exec();
  }

  /**
   * Implement approved change request
   */
  async implementChangeRequest(requestId: string, performedBy: string): Promise<any> {
    const changeRequest = await this.changeRequestModel.findById(new Types.ObjectId(requestId));
    if (!changeRequest) {
      throw new NotFoundException('Change request not found');
    }

    if (changeRequest.status !== StructureRequestStatus.APPROVED) {
      throw new BadRequestException('Only approved requests can be implemented');
    }

    let result: any;

    // Implement based on request type
    switch (changeRequest.requestType) {
      case StructureRequestType.NEW_DEPARTMENT:
        // For NEW_DEPARTMENT, the details field contains the department data as JSON
        try {
          const deptData = JSON.parse(changeRequest.details || '{}');
          // If targetDepartmentId is provided, it means the department data is there
          if (deptData.code && deptData.name) {
            result = await this.createDepartment(deptData, performedBy);
          } else {
            // If not properly formatted, just mark as implemented
            result = { message: 'Department request approved, manual creation required' };
          }
        } catch (error) {
          // If parsing fails, mark as implemented anyway
          result = { message: 'Department request approved, details: ' + changeRequest.details };
        }
        break;

      case StructureRequestType.UPDATE_DEPARTMENT:
        const updateDeptData = JSON.parse(changeRequest.details || '{}');
        result = await this.updateDepartment(
          changeRequest.targetDepartmentId!.toString(),
          updateDeptData,
          performedBy,
        );
        break;

      case StructureRequestType.NEW_POSITION:
        try {
          const posData = JSON.parse(changeRequest.details || '{}');
          if (posData.code && posData.title && posData.departmentId) {
            result = await this.createPosition(posData, performedBy);
          } else {
            result = { message: 'Position request approved, manual creation required' };
          }
        } catch (error) {
          result = { message: 'Position request approved, details: ' + changeRequest.details };
        }
        break;

      case StructureRequestType.UPDATE_POSITION:
        const updatePosData = JSON.parse(changeRequest.details || '{}');
        result = await this.updatePosition(
          changeRequest.targetPositionId!.toString(),
          updatePosData,
          performedBy,
        );
        break;

      case StructureRequestType.CLOSE_POSITION:
        result = await this.deactivatePosition(
          changeRequest.targetPositionId!.toString(),
          performedBy,
        );
        break;

      default:
        throw new BadRequestException('Unknown request type');
    }

    // Update employee profile based on the change request
    const requesterEmployeeId = changeRequest.requestedByEmployeeId;
    
    if (changeRequest.requestType === StructureRequestType.NEW_POSITION || 
        changeRequest.requestType === StructureRequestType.UPDATE_POSITION) {
      // Update the requester's primary position if a position was created/updated
      if (result && result._id) {
        await this.employeeProfileModel.findByIdAndUpdate(
          requesterEmployeeId,
          { 
            primaryPositionId: result._id,
            // Also update department if position has one
            ...(result.departmentId && { primaryDepartmentId: result.departmentId })
          }
        );
      }
    } else if (changeRequest.requestType === StructureRequestType.NEW_DEPARTMENT) {
      // For NEW_DEPARTMENT, use the created department's _id OR the targetDepartmentId
      const deptIdToAssign = (result && result._id) ? result._id : changeRequest.targetDepartmentId;
      if (deptIdToAssign) {
        await this.employeeProfileModel.findByIdAndUpdate(
          requesterEmployeeId,
          { primaryDepartmentId: deptIdToAssign }
        );
      }
    } else if (changeRequest.requestType === StructureRequestType.UPDATE_DEPARTMENT) {
      // For UPDATE_DEPARTMENT, use the targetDepartmentId
      if (changeRequest.targetDepartmentId) {
        await this.employeeProfileModel.findByIdAndUpdate(
          requesterEmployeeId,
          { primaryDepartmentId: changeRequest.targetDepartmentId }
        );
      }
    }

    // Mark request as implemented
    changeRequest.status = StructureRequestStatus.IMPLEMENTED;
    await changeRequest.save();

    return result;
  }

  // ========== CHANGE LOG ==========

  /**
   * Get change logs
   */
  async getChangeLogs(entityType?: string, entityId?: string): Promise<StructureChangeLog[]> {
    const filter: any = {};
    if (entityType) filter.entityType = entityType;
    if (entityId) filter.entityId = new Types.ObjectId(entityId);

    return await this.changeLogModel
      .find(filter)
      .populate('performedByEmployeeId')
      .sort({ createdAt: -1 })
      .exec();
  }

  // ========== HELPER METHODS ==========

  /**
   * Log structural changes (BR 22: Audit trail)
   */
  private async logChange(
    action: ChangeLogAction,
    entityType: string,
    entityId: Types.ObjectId,
    performedBy: string,
    summary: string,
    beforeSnapshot: any,
    afterSnapshot: any,
  ): Promise<StructureChangeLog> {
    const changeLog = new this.changeLogModel({
      _id: new Types.ObjectId(),
      action,
      entityType,
      entityId,
      performedByEmployeeId: performedBy && Types.ObjectId.isValid(performedBy) 
        ? new Types.ObjectId(performedBy) 
        : undefined,
      summary,
      beforeSnapshot,
      afterSnapshot,
    });

    return await changeLog.save();
  }

  /**
   * Check for circular reporting relationships
   */
  private async checkCircularReporting(
    positionId: string,
    reportsToId: string,
  ): Promise<boolean> {
    // Check if setting positionId to report to reportsToId would create a circle
    // We need to check the NEW state (after the update), not the current state
    
    const normalizedPositionId = positionId.toString();
    let currentId = reportsToId.toString();
    const visited = new Set<string>();

    while (currentId) {
      const normalizedCurrentId = currentId.toString();
      
      if (normalizedCurrentId === normalizedPositionId) {
        return true; // Circular reference detected
      }

      if (visited.has(normalizedCurrentId)) {
        return false; // Already checked this branch, no circle
      }

      visited.add(normalizedCurrentId);

      const position = await this.positionModel.findById(currentId).select('reportsToPositionId').lean();
      if (!position) {
        return false; // Position not found, chain ends
      }
      
      if (!position.reportsToPositionId) {
        return false; // Chain ends at top-level position
      }

      currentId = position.reportsToPositionId.toString();
    }

    return false;
  }
}

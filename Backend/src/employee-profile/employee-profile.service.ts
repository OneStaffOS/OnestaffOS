import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { EmployeeProfile, EmployeeProfileDocument } from './models/employee-profile.schema';
import { EmployeeSystemRole, EmployeeSystemRoleDocument } from './models/employee-system-role.schema';
import { EmployeeProfileChangeRequest } from './models/ep-change-request.schema';
import { EmployeeQualification } from './models/qualification.schema';
import { CreateEmployeeProfileDto } from './dto/create-employee-profile.dto';
import { UpdateEmployeeProfileDto } from './dto/update-employee-profile.dto';
import { UpdateSelfServiceDto } from './dto/update-self-service.dto';
import { CreateChangeRequestDto } from './dto/create-change-request.dto';
import { ProcessChangeRequestDto } from './dto/process-change-request.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';
import { CreateQualificationDto } from './dto/create-qualification.dto';
import { ProfileChangeStatus, EmployeeStatus } from './enums/employee-profile.enums';
import { PositionAssignment, PositionAssignmentDocument } from '../organization-structure/models/position-assignment.schema';
import { Position, PositionDocument } from '../organization-structure/models/position.schema';
import { Department, DepartmentDocument } from '../organization-structure/models/department.schema';
import { AppraisalAssignment, AppraisalAssignmentDocument } from '../performance/models/appraisal-assignment.schema';
import { AppraisalRecord, AppraisalRecordDocument } from '../performance/models/appraisal-record.schema';
import { AppraisalDispute, AppraisalDisputeDocument } from '../performance/models/appraisal-dispute.schema';

@Injectable()
export class EmployeeProfileService {
  constructor(
    @InjectModel(EmployeeProfile.name)
    private employeeProfileModel: Model<EmployeeProfileDocument>,
    @InjectModel(EmployeeSystemRole.name)
    private employeeSystemRoleModel: Model<EmployeeSystemRoleDocument>,
    @InjectModel(EmployeeProfileChangeRequest.name)
    private changeRequestModel: Model<EmployeeProfileChangeRequest>,
    @InjectModel(EmployeeQualification.name)
    private qualificationModel: Model<EmployeeQualification>,
    @InjectModel(PositionAssignment.name)
    private positionAssignmentModel: Model<PositionAssignmentDocument>,
    @InjectModel(Position.name)
    private positionModel: Model<PositionDocument>,
    @InjectModel(Department.name)
    private departmentModel: Model<DepartmentDocument>,
    @InjectModel(AppraisalAssignment.name)
    private appraisalAssignmentModel: Model<AppraisalAssignmentDocument>,
    @InjectModel(AppraisalRecord.name)
    private appraisalRecordModel: Model<AppraisalRecordDocument>,
    @InjectModel(AppraisalDispute.name)
    private appraisalDisputeModel: Model<AppraisalDisputeDocument>,
  ) {}

  // ========== EMPLOYEE SELF-SERVICE METHODS ==========

  /**
   * US-E2-04: View full employee profile
   */
  async getMyProfile(employeeId: string): Promise<EmployeeProfile> {
    const profile = await this.employeeProfileModel
      .findById(employeeId)
      .populate('primaryPositionId')
      .populate('primaryDepartmentId')
      .populate('supervisorPositionId')
      .populate('payGradeId')
      .populate('lastAppraisalRecordId')
      .populate('accessProfileId')
      .exec();

    if (!profile) {
      throw new NotFoundException('Employee profile not found');
    }
    
    return profile;
  }

  /**
   * US-E2-05, US-E2-12: Update contact information, biography, and profile picture (Self-Service)
   */
  async updateSelfService(
    employeeId: string,
    updateDto: UpdateSelfServiceDto,
  ): Promise<EmployeeProfile> {
    const profile = await this.employeeProfileModel.findById(employeeId);

    if (!profile) {
      throw new NotFoundException('Employee profile not found');
    }

    // Update only allowed self-service fields
    if (updateDto.personalEmail) profile.personalEmail = updateDto.personalEmail;
    if (updateDto.mobilePhone) profile.mobilePhone = updateDto.mobilePhone;
    if (updateDto.homePhone) profile.homePhone = updateDto.homePhone;
    if (updateDto.address) profile.address = updateDto.address;
    if (updateDto.profilePictureUrl) profile.profilePictureUrl = updateDto.profilePictureUrl;
    if (updateDto.biography) profile.biography = updateDto.biography;

    return await profile.save();
  }

  /**
   * US-E6-02: Request corrections of data (e.g., job title, department)
   */
  async createChangeRequest(
    employeeId: string,
    createDto: CreateChangeRequestDto,
  ): Promise<EmployeeProfileChangeRequest> {
    const profile = await this.employeeProfileModel.findById(employeeId);

    if (!profile) {
      throw new NotFoundException('Employee profile not found');
    }

    // Generate unique request ID
    const requestId = `CR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const changeRequest = new this.changeRequestModel({
      requestId,
      employeeProfileId: new Types.ObjectId(employeeId),
      requestDescription: createDto.requestDescription,
      reason: createDto.reason,
      status: ProfileChangeStatus.PENDING,
      submittedAt: new Date(),
    });

    return await changeRequest.save();
  }

  /**
   * View change requests for an employee
   */
  async getMyChangeRequests(employeeId: string): Promise<EmployeeProfileChangeRequest[]> {
    return await this.changeRequestModel
      .find({ employeeProfileId: new Types.ObjectId(employeeId) })
      .sort({ submittedAt: -1 })
      .exec();
  }

  /**
   * Add qualification for employee
   */
  async addQualification(
    employeeId: string,
    createDto: CreateQualificationDto,
  ): Promise<EmployeeQualification> {
    const profile = await this.employeeProfileModel.findById(employeeId);

    if (!profile) {
      throw new NotFoundException('Employee profile not found');
    }

    const qualification = new this.qualificationModel({
      employeeProfileId: new Types.ObjectId(employeeId),
      establishmentName: createDto.establishmentName,
      graduationType: createDto.graduationType,
    });

    return await qualification.save();
  }

  /**
   * Get qualifications for employee
   */
  async getMyQualifications(employeeId: string): Promise<EmployeeQualification[]> {
    return await this.qualificationModel
      .find({ employeeProfileId: new Types.ObjectId(employeeId) })
      .exec();
  }

  // ========== DEPARTMENT MANAGER METHODS ==========

  /**
   * US-E4-01, US-E4-02: View team members' profiles (excluding sensitive info)
   */
  async getTeamProfiles(supervisorPositionId: string): Promise<Partial<EmployeeProfile>[]> {
    const teamMembers = await this.employeeProfileModel
      .find({ supervisorPositionId: new Types.ObjectId(supervisorPositionId) })
      .populate('primaryPositionId')
      .populate('primaryDepartmentId')
      .select('-nationalId -personalEmail -mobilePhone -homePhone -address -payGradeId -dateOfBirth')
      .exec();

    return teamMembers;
  }

  /**
   * Get department members who currently have active position assignments
   * (endDate === null). Uses the supervisor's position to resolve the
   * departmentId and returns employee profiles for assignments in that
   * department. This returns only employees that currently have an active
   * assignment in the same department as the supervisor.
   */
  async getDepartmentMembersWithAssignments(
    supervisorPositionId: string,
    managerProfileIdOrDebug?: string | boolean,
    maybeDebug?: boolean,
  ): Promise<Partial<EmployeeProfile>[] | { debugInfo: any; results: Partial<EmployeeProfile>[] }> {
    // normalize params: support older signature (supervisorPositionId, debug)
    let managerProfileId: string | undefined;
    let debug = false;
    if (typeof managerProfileIdOrDebug === 'string') {
      managerProfileId = managerProfileIdOrDebug;
      debug = !!maybeDebug;
    } else {
      debug = !!managerProfileIdOrDebug;
    }
    // load supervisor position to determine department
    const supervisorPosition = supervisorPositionId ? await this.positionModel.findById(supervisorPositionId).select('departmentId').lean() : null;
    // also fetch full supervisor position for diagnostics (if we have an id)
    const fullSupervisorPosition = supervisorPositionId ? await this.positionModel.findById(supervisorPositionId).lean() : null;

    // Prefer using the logged-in user's primaryDepartmentId when provided or the supervisor position's departmentId
    let deptId: any = null;
    if (supervisorPosition && supervisorPosition.departmentId) {
      deptId = supervisorPosition.departmentId as Types.ObjectId;
    }

    if (managerProfileId) {
      try {
        const managerProfile = await this.employeeProfileModel.findById(managerProfileId).select('primaryDepartmentId').lean();
        if (managerProfile && (managerProfile as any).primaryDepartmentId) {
          deptId = (managerProfile as any).primaryDepartmentId as Types.ObjectId;
        }
      } catch (e) {
        // ignore and fall back to supervisorPosition departmentId
      }
    }

    // If we still don't have a deptId, nothing to query
    if (!deptId) {
      return [];
    }

    // Ensure deptId is an ObjectId instance for queries
    try {
      if (deptId && !(deptId instanceof Types.ObjectId)) {
        deptId = new Types.ObjectId(String(deptId));
      }
    } catch (e) {
      // ignore conversion errors and allow downstream handling
    }

    // find appraisal assignments in that department, then fetch appraisal records linked to those assignments
    let assignments: any[] = [];
    let records: AppraisalRecordDocument[] = [];
    try {
      assignments = await this.appraisalAssignmentModel
        .find({ departmentId: deptId })
        .select('_id')
        .lean()
        .exec();
      const assignmentIds = assignments.map(a => a._id).filter(Boolean).map(id => new Types.ObjectId(String(id)));

      if (assignmentIds.length > 0) {
        records = await this.appraisalRecordModel
          .find({ assignmentId: { $in: assignmentIds } })
          .populate('employeeProfileId')
          .exec();
      }
    } catch (e) {
      assignments = [];
      records = [];
    }

    // If we found no records, try fallback: appraisal records where managerProfileId === caller
    let fallbackUsed = false;
    if ((!records || records.length === 0) && managerProfileId) {
      try {
        records = await this.appraisalRecordModel
          .find({ managerProfileId: new Types.ObjectId(managerProfileId) })
          .populate('employeeProfileId')
          .exec();
        fallbackUsed = true;
      } catch (e) {
        records = [];
      }
    }

    // Diagnostics when debugging: return department id and counts
    if (debug) {
      const sample = records.slice(0, 5).map(r => ({ id: r._id.toString(), employee: (r.employeeProfileId as any)?._id, managerProfileId: (r as any).managerProfileId?.toString?.() || String((r as any).managerProfileId) }));

      // Build appraisal_records diagnostics
      const appraisalStats = {
        totalRecords: records.length,
        withTotalScore: 0,
        withManagerSummary: 0,
        avgTotalScore: null as number | null,
        statusCounts: {} as Record<string, number>,
        avgRatingsCount: 0,
        sampleRecords: [] as Array<any>,
      };

      let scoreSum = 0;
      let scoreCount = 0;
      let ratingsTotal = 0;

      records.forEach((r, idx) => {
        const hasScore = (r as any).totalScore !== undefined && (r as any).totalScore !== null;
        if (hasScore) {
          appraisalStats.withTotalScore++;
          scoreSum += Number((r as any).totalScore) || 0;
          scoreCount++;
        }
        if ((r as any).managerSummary && String((r as any).managerSummary).trim().length > 0) {
          appraisalStats.withManagerSummary++;
        }

        const st = String((r as any).status || 'UNKNOWN');
        appraisalStats.statusCounts[st] = (appraisalStats.statusCounts[st] || 0) + 1;

        const ratingsLen = Array.isArray((r as any).ratings) ? (r as any).ratings.length : 0;
        ratingsTotal += ratingsLen;

        if (idx < 5) {
          appraisalStats.sampleRecords.push({
            id: (r._id as any)?.toString?.(),
            assignmentId: (r as any).assignmentId?.toString?.(),
            employeeId: (r.employeeProfileId as any)?._id,
            totalScore: (r as any).totalScore,
            managerSummaryPresent: !!((r as any).managerSummary && String((r as any).managerSummary).trim().length > 0),
            ratingsCount: ratingsLen,
            status: (r as any).status,
          });
        }
      });

      appraisalStats.avgTotalScore = scoreCount > 0 ? +(scoreSum / scoreCount).toFixed(2) : null;
      appraisalStats.avgRatingsCount = records.length > 0 ? +(ratingsTotal / records.length).toFixed(2) : 0;


      // include department doc and supervisor position doc for diagnostics
      const departmentDoc = deptId ? await this.departmentModel.findById(deptId).lean() : null;

      const assignmentsManagerMap: any = {};
      records.forEach(r => {
        let mgr = (r as any).managerProfileId;
        try {
          mgr = mgr ? mgr.toString() : null;
        } catch (e) {
          mgr = String(mgr);
        }
        assignmentsManagerMap[r._id.toString()] = { managerProfileId: mgr, employeeProfileId: (r.employeeProfileId as any)?._id, assignmentId: (r as any).assignmentId?.toString() };
      });

      const debugInfo: any = {
        callerManagerId: managerProfileId || null,
        supervisorPositionId,
        supervisorPositionResolved: supervisorPosition || null,
        supervisorPositionFull: fullSupervisorPosition || null,
        resolvedDeptId: deptId?.toString() || null,
        departmentDoc: departmentDoc || null,
        assignmentCount: assignments.length,
        sampleAssignments: sample,
        appraisalRecordsDebug: appraisalStats,
        fallbackUsed,
        assignmentsManagerMap,
      };

      // build profiles as usual
      const profilesDebug: Partial<EmployeeProfile>[] = [];
      const seenDebug = new Set<string>();
      for (const r of records) {
        const emp = (r.employeeProfileId as any) || null;
        if (!emp) continue;
        const id = String(emp._id);
        if (seenDebug.has(id)) continue;
        seenDebug.add(id);
        profilesDebug.push({
          _id: emp._id,
          firstName: emp.firstName,
          lastName: emp.lastName,
          employeeNumber: emp.employeeNumber,
          primaryPositionId: emp.primaryPositionId,
          primaryDepartmentId: emp.primaryDepartmentId,
          status: emp.status,
          // include latest appraisal data
          appraisal: {
            appraisalId: (r._id as any)?.toString?.(),
            assignmentId: (r as any).assignmentId?.toString?.(),
            cycleId: (r as any).cycleId?.toString?.(),
            templateId: (r as any).templateId?.toString?.(),
            totalScore: (r as any).totalScore,
            overallRatingLabel: (r as any).overallRatingLabel,
            managerSummary: (r as any).managerSummary,
            strengths: (r as any).strengths,
            improvementAreas: (r as any).improvementAreas,
            status: (r as any).status,
            managerSubmittedAt: (r as any).managerSubmittedAt,
            ratings: (r as any).ratings || [],
          },
        } as any);
      }

      return { debugInfo, results: profilesDebug };
    }

    const profiles: Partial<EmployeeProfile>[] = [];
    const seen = new Set<string>();

    for (const r of records) {
      const emp = (r.employeeProfileId as any) || null;
      if (!emp) continue;
      const id = String(emp._id);
      if (seen.has(id)) continue;
      seen.add(id);

      // include safe fields similar to getTeamProfiles + appraisal summary
      profiles.push({
        _id: emp._id,
        firstName: emp.firstName,
        lastName: emp.lastName,
        employeeNumber: emp.employeeNumber,
        primaryPositionId: emp.primaryPositionId,
        primaryDepartmentId: emp.primaryDepartmentId,
        status: emp.status,
        appraisal: {
          appraisalId: (r._id as any)?.toString?.(),
          assignmentId: (r as any).assignmentId?.toString?.(),
          cycleId: (r as any).cycleId?.toString?.(),
          templateId: (r as any).templateId?.toString?.(),
          totalScore: (r as any).totalScore,
          overallRatingLabel: (r as any).overallRatingLabel,
          managerSummary: (r as any).managerSummary,
          strengths: (r as any).strengths,
          improvementAreas: (r as any).improvementAreas,
          status: (r as any).status,
          managerSubmittedAt: (r as any).managerSubmittedAt,
        },
      } as any);
    }

    return profiles;
  }

  /**
   * Get team summary
   */
  async getTeamSummary(supervisorPositionId: string): Promise<any[]> {
    const teamMembers = await this.employeeProfileModel
      .find({ supervisorPositionId: new Types.ObjectId(supervisorPositionId) })
      .populate('primaryPositionId', 'title')
      .populate('primaryDepartmentId', 'name')
      .select('firstName lastName employeeNumber dateOfHire status primaryPositionId primaryDepartmentId')
      .exec();

    return teamMembers.map((member) => ({
      employeeNumber: member.employeeNumber,
      name: `${member.firstName} ${member.lastName}`,
      position: member.primaryPositionId,
      department: member.primaryDepartmentId,
      dateOfHire: member.dateOfHire,
      status: member.status,
    }));
  }

  /**
   * Add a department-head comment by creating an appraisal_dispute record.
   * We reuse appraisal_disputes to avoid changing existing schemas.
   */
  async addDeptHeadComment(appraisalId: string, raisedByEmployeeId: string, comment: string) {
    // load the appraisal record to obtain assignmentId and cycleId
    const record = await this.appraisalRecordModel.findById(appraisalId).lean();
    if (!record) {
      throw new NotFoundException('Appraisal record not found');
    }

    if (!record.assignmentId) {
      console.warn('[EmployeeProfileService] addDeptHeadComment - appraisal record has no assignmentId', { appraisalId });
      throw new BadRequestException('Appraisal record missing assignment information');
    }

    const dispute = new this.appraisalDisputeModel({
      _id: new Types.ObjectId(),
      appraisalId: new Types.ObjectId(appraisalId),
      assignmentId: record.assignmentId,
      cycleId: record.cycleId,
      raisedByEmployeeId: new Types.ObjectId(raisedByEmployeeId),
      reason: 'dept_head_comment',
      details: comment,
      submittedAt: new Date(),
      status: 'OPEN',
    });

    return await dispute.save();
  }

  // ========== HR ADMIN / SYSTEM ADMIN METHODS ==========

  /**
   * US-EP-04: Create employee profile (HR Admin only)
   */
  async createEmployeeProfile(createDto: CreateEmployeeProfileDto): Promise<EmployeeProfile> {
    // Check if employee number or national ID already exists
    const existingEmployee = await this.employeeProfileModel.findOne({
      $or: [
        { employeeNumber: createDto.employeeNumber },
        { nationalId: createDto.nationalId },
      ],
    });

    if (existingEmployee) {
      throw new BadRequestException('Employee number or National ID already exists');
    }

    // Hash the password before saving
    const passwordHash = await bcrypt.hash(createDto.password, 10);

    const fullName = `${createDto.firstName} ${createDto.middleName || ''} ${createDto.lastName}`.trim();

    const newProfile = new this.employeeProfileModel({
      ...createDto,
      password: passwordHash,
      fullName,
      primaryPositionId: createDto.primaryPositionId ? new Types.ObjectId(createDto.primaryPositionId) : undefined,
      primaryDepartmentId: createDto.primaryDepartmentId ? new Types.ObjectId(createDto.primaryDepartmentId) : undefined,
      supervisorPositionId: createDto.supervisorPositionId ? new Types.ObjectId(createDto.supervisorPositionId) : undefined,
      payGradeId: createDto.payGradeId ? new Types.ObjectId(createDto.payGradeId) : undefined,
      status: createDto.status || EmployeeStatus.ACTIVE,
      statusEffectiveFrom: new Date(),
    });

    return await newProfile.save();
  }

  /**
   * US-EP-04: Edit any part of employee profile (HR Admin only)
   */
  async updateEmployeeProfile(
    employeeId: string,
    updateDto: UpdateEmployeeProfileDto,
  ): Promise<EmployeeProfile> {
    const profile = await this.employeeProfileModel.findById(employeeId);

    if (!profile) {
      throw new NotFoundException('Employee profile not found');
    }

    // Update full name if name fields change
    if (updateDto.firstName || updateDto.middleName || updateDto.lastName) {
      const firstName = updateDto.firstName || profile.firstName;
      const middleName = updateDto.middleName !== undefined ? updateDto.middleName : profile.middleName;
      const lastName = updateDto.lastName || profile.lastName;
      updateDto['fullName'] = `${firstName} ${middleName || ''} ${lastName}`.trim();
    }

    // Handle ObjectId conversions
    if (updateDto.primaryPositionId) {
      updateDto['primaryPositionId'] = new Types.ObjectId(updateDto.primaryPositionId);
    }
    if (updateDto.primaryDepartmentId) {
      updateDto['primaryDepartmentId'] = new Types.ObjectId(updateDto.primaryDepartmentId);
    }
    if (updateDto.supervisorPositionId) {
      updateDto['supervisorPositionId'] = new Types.ObjectId(updateDto.supervisorPositionId);
    }
    if (updateDto.payGradeId) {
      updateDto['payGradeId'] = new Types.ObjectId(updateDto.payGradeId);
    }

    // Hash password if it's being updated
    if (updateDto.password) {
      updateDto['password'] = await bcrypt.hash(updateDto.password, 10);
    }

    // If status changes, update statusEffectiveFrom
    if (updateDto.status && updateDto.status !== profile.status) {
      updateDto['statusEffectiveFrom'] = new Date();
    }

    Object.assign(profile, updateDto);
    return await profile.save();
  }

  /**
   * US-E6-03: Search for employees data (HR Admin)
   */
  async searchEmployees(query: string): Promise<EmployeeProfile[]> {
    const searchRegex = new RegExp(query, 'i');

    return await this.employeeProfileModel
      .find({
        $or: [
          { firstName: searchRegex },
          { lastName: searchRegex },
          { employeeNumber: searchRegex },
          { nationalId: searchRegex },
          { workEmail: searchRegex },
        ],
      })
      .populate('primaryPositionId')
      .populate('primaryDepartmentId')
      .exec();
  }

  /**
   * Find a single employee by their primary position id.
   * Returns null if none found. Accessible to authenticated users.
   */
  async getEmployeeByPrimaryPosition(positionId: string): Promise<Partial<EmployeeProfile> | null> {
    if (!positionId) return null;
    try {
      const emp = await this.employeeProfileModel
        .findOne({ primaryPositionId: new Types.ObjectId(positionId), status: EmployeeStatus.ACTIVE })
        .select('firstName lastName fullName _id workEmail')
        .populate('primaryPositionId', 'title')
        .lean()
        .exec();

      return emp || null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Get all employee profiles (HR Admin)
   */
  async getAllEmployeeProfiles(): Promise<EmployeeProfile[]> {
    return await this.employeeProfileModel
      .find()
      .populate('primaryPositionId')
      .populate('primaryDepartmentId')
      .populate('supervisorPositionId')
      .populate('payGradeId')
      .populate('accessProfileId')
      .exec();
  }

  /**
   * Get employee profile by ID (HR Admin)
   */
  async getEmployeeProfileById(employeeId: string): Promise<EmployeeProfile> {
    const profile = await this.employeeProfileModel
      .findById(employeeId)
      .populate('primaryPositionId')
      .populate('primaryDepartmentId')
      .populate('supervisorPositionId')
      .populate('payGradeId')
      .populate('lastAppraisalRecordId')
      .populate('accessProfileId')
      .exec();

    if (!profile) {
      throw new NotFoundException('Employee profile not found');
    }

    return profile;
  }

  /**
   * US-EP-05: Deactivate employee profile (HR Admin)
   */
  async deactivateEmployeeProfile(employeeId: string): Promise<EmployeeProfile> {
    const profile = await this.employeeProfileModel.findById(employeeId);

    if (!profile) {
      throw new NotFoundException('Employee profile not found');
    }

    profile.status = EmployeeStatus.TERMINATED;
    profile.statusEffectiveFrom = new Date();

    return await profile.save();
  }

  /**
   * US-E2-03: Review and process change requests (HR Admin)
   */
  async getAllChangeRequests(): Promise<EmployeeProfileChangeRequest[]> {
    return await this.changeRequestModel
      .find()
      .populate('employeeProfileId')
      .sort({ submittedAt: -1 })
      .exec();
  }

  /**
   * Process change request (approve/reject)
   */
  async processChangeRequest(
    requestId: string,
    processDto: ProcessChangeRequestDto,
  ): Promise<EmployeeProfileChangeRequest> {
    const changeRequest = await this.changeRequestModel.findOne({ requestId });

    if (!changeRequest) {
      throw new NotFoundException('Change request not found');
    }

    if (changeRequest.status !== ProfileChangeStatus.PENDING) {
      throw new BadRequestException('Change request has already been processed');
    }

    changeRequest.status = processDto.status;
    changeRequest.processedAt = new Date();

    return await changeRequest.save();
  }

  /**
   * US-E7-05: Assign roles and access permissions to employee (HR Admin)
   */
  async assignRoles(employeeId: string, assignDto: AssignRolesDto): Promise<EmployeeSystemRole> {
    const profile = await this.employeeProfileModel.findById(employeeId);

    if (!profile) {
      throw new NotFoundException('Employee profile not found');
    }

    // Check if employee already has a system role record
    let systemRole = await this.employeeSystemRoleModel.findOne({
      employeeProfileId: new Types.ObjectId(employeeId),
    });

    if (systemRole) {
      // Update existing roles
      systemRole.roles = assignDto.roles;
      if (assignDto.permissions) systemRole.permissions = assignDto.permissions;
      if (assignDto.isActive !== undefined) systemRole.isActive = assignDto.isActive;
    } else {
      // Create new system role
      systemRole = new this.employeeSystemRoleModel({
        employeeProfileId: new Types.ObjectId(employeeId),
        roles: assignDto.roles,
        permissions: assignDto.permissions || [],
        isActive: assignDto.isActive !== undefined ? assignDto.isActive : true,
      });
    }

    const savedRole = await systemRole.save();

    // Update employee profile with reference to access profile
    profile.accessProfileId = savedRole._id as Types.ObjectId;
    await profile.save();

    return savedRole;
  }

  /**
   * Get employee system roles
   */
  async getEmployeeRoles(employeeId: string): Promise<EmployeeSystemRole> {
    const systemRole = await this.employeeSystemRoleModel
      .findOne({ employeeProfileId: new Types.ObjectId(employeeId) })
      .exec();

    if (!systemRole) {
      throw new NotFoundException('System role not found for this employee');
    }

    return systemRole;
  }

  /**
   * Get all qualifications for an employee (HR Admin)
   */
  async getEmployeeQualifications(employeeId: string): Promise<EmployeeQualification[]> {
    return await this.qualificationModel
      .find({ employeeProfileId: new Types.ObjectId(employeeId) })
      .exec();
  }

  /**
   * Delete qualification
   */
  async deleteQualification(qualificationId: string): Promise<void> {
    const result = await this.qualificationModel.findByIdAndDelete(qualificationId);

    if (!result) {
      throw new NotFoundException('Qualification not found');
    }
  }

  /**
   * Find employee by email for authentication
   */
  async findByEmailForAuth(email: string): Promise<EmployeeProfile | null> {
    return await this.employeeProfileModel
      .findOne({
        $or: [
          { workEmail: email },
          { personalEmail: email }
        ]
      })
      .select('+password')
      .populate('accessProfileId')
      .exec();
  }

  // ========== ADMIN DASHBOARD METHODS ==========

  /**
   * Get admin dashboard statistics
   */
  async getAdminStats() {
    const [
      totalUsers,
      activeEmployees,
      suspendedEmployees,
      onLeaveEmployees,
      pendingRequests,
    ] = await Promise.all([
      this.employeeProfileModel.countDocuments(),
      this.employeeProfileModel.countDocuments({ status: EmployeeStatus.ACTIVE }),
      this.employeeProfileModel.countDocuments({ status: EmployeeStatus.SUSPENDED }),
      this.employeeProfileModel.countDocuments({ status: EmployeeStatus.ON_LEAVE }),
      this.changeRequestModel.countDocuments({ status: ProfileChangeStatus.PENDING }),
    ]);

    // Count recent registrations (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentRegistrations = await this.employeeProfileModel.countDocuments({
      dateOfHire: { $gte: thirtyDaysAgo }
    });

    // Get department count (assuming you have organization structure)
    const totalDepartments = 0; // Will need organization structure integration

    return {
      totalUsers,
      activeEmployees,
      suspendedEmployees,
      onLeaveEmployees,
      totalDepartments,
      pendingRequests,
      recentRegistrations,
      systemHealth: 'healthy' as const,
    };
  }

  /**
   * Get recent activity for admin dashboard
   */
  async getRecentActivity(limit: number = 10) {
    const recentChanges = await this.changeRequestModel
      .find()
      .sort({ submittedAt: -1 })
      .limit(limit)
      .populate('employeeProfileId', 'firstName lastName employeeId')
      .exec();

    return recentChanges.map(change => ({
      id: change._id.toString(),
      type: 'change_request',
      user: `${(change.employeeProfileId as any).firstName} ${(change.employeeProfileId as any).lastName}`,
      description: change.requestDescription,
      timestamp: change.submittedAt.toISOString(),
    }));
  }

  /**
   * Get pending change requests with employee details
   */
  async getPendingChangeRequests(status?: ProfileChangeStatus) {
    const filter = status ? { status } : {};
    const requests = await this.changeRequestModel
      .find(filter)
      .sort({ submittedAt: -1 })
      .populate('employeeProfileId', 'firstName lastName employeeId')
      .exec();

    return requests.map(req => ({
      id: req._id.toString(),
      employeeName: `${(req.employeeProfileId as any).firstName} ${(req.employeeProfileId as any).lastName}`,
      employeeId: (req.employeeProfileId as any).employeeId,
      requestType: 'profile_correction',
      field: 'Profile Data',
      currentValue: 'See description',
      requestedValue: req.requestDescription,
      submittedDate: req.submittedAt.toISOString().split('T')[0],
      status: req.status,
    }));
  }

  /**
   * Approve change request (Admin/HR Manager)
   */
  async approveChangeRequest(requestId: string, adminId: string) {
    const request = await this.changeRequestModel
      .findById(requestId)
      .populate('employeeProfileId')
      .exec();

    if (!request) {
      throw new NotFoundException('Change request not found');
    }

    if (request.status !== ProfileChangeStatus.PENDING) {
      throw new BadRequestException('Request has already been processed');
    }

    // Parse the request description to extract field and new value
    // Format: "Change request for {fieldName}: from "{oldValue}" to "{newValue}". Reason: {reason}"
    const parseRequestDescription = (description: string) => {
      const fieldMatch = description.match(/Change request for ([^:]+):/);
      const toMatch = description.match(/to "([^"]+)"/);
      
      if (fieldMatch && toMatch) {
        return {
          fieldName: fieldMatch[1].trim(),
          newValue: toMatch[1]
        };
      }
      return null;
    };

    const parsed = parseRequestDescription(request.requestDescription);
    
    if (parsed && request.employeeProfileId) {
      // Update the employee profile with the new value
      const employeeId = (request.employeeProfileId as any)._id;
      const updateData: any = {};
      
      // Map field names to database field names
      const fieldMapping: { [key: string]: string } = {
        'First Name': 'firstName',
        'Last Name': 'lastName',
        'Middle Name': 'middleName',
        'National ID': 'nationalId',
        'Marital Status': 'maritalStatus',
        'Gender': 'gender',
        'Personal Email': 'personalEmail',
        'Work Email': 'workEmail',
        'Mobile Phone': 'mobilePhone',
        'Home Phone': 'homePhone',
        'Date of Hire': 'dateOfHire',
        'Biography': 'biography',
      };

      const dbFieldName = fieldMapping[parsed.fieldName] || parsed.fieldName;
      
      // Handle position change specially
      if (parsed.fieldName === 'Job Title/Position' || parsed.fieldName === 'position') {
        // Find the position by title
        const position = await this.positionModel.findOne({ title: parsed.newValue });
        if (position) {
          // End current assignment
          await this.positionAssignmentModel.updateMany(
            { employeeProfileId: employeeId, endDate: null },
            { endDate: new Date() }
          );
          
          // Create new assignment
          const newAssignment = new this.positionAssignmentModel({
            _id: new Types.ObjectId(),
            employeeProfileId: employeeId,
            positionId: position._id,
            departmentId: position.departmentId,
            startDate: new Date(),
          });
          await newAssignment.save();
        }
      }
      // Handle department change specially
      else if (parsed.fieldName === 'Department' || parsed.fieldName === 'department') {
        // Find the department by name
        const department = await this.departmentModel.findOne({ name: parsed.newValue });
        if (department) {
          // Update the current assignment's department
          await this.positionAssignmentModel.updateOne(
            { employeeProfileId: employeeId, endDate: null },
            { departmentId: department._id }
          );
        }
      }
      // Handle other fields normally
      else {
        updateData[dbFieldName] = parsed.newValue;
        await this.employeeProfileModel.findByIdAndUpdate(
          employeeId,
          updateData,
          { new: true }
        );
      }
    }

    // Mark request as approved
    request.status = ProfileChangeStatus.APPROVED;
    request.processedAt = new Date();
    await request.save();

    return { message: 'Change request approved and profile updated successfully' };
  }

  /**
   * Reject change request (Admin/HR Manager)
   */
  async rejectChangeRequest(requestId: string, adminId: string) {
    const request = await this.changeRequestModel.findById(requestId).exec();

    if (!request) {
      throw new NotFoundException('Change request not found');
    }

    if (request.status !== ProfileChangeStatus.PENDING) {
      throw new BadRequestException('Request has already been processed');
    }

    request.status = ProfileChangeStatus.REJECTED;
    request.processedAt = new Date();
    await request.save();

    return { message: 'Change request rejected' };
  }

  /**
   * Update employee status (Activate, Suspend, Terminate)
   */
  async updateEmployeeStatus(employeeId: string, status: EmployeeStatus) {
    const profile = await this.employeeProfileModel.findById(employeeId);

    if (!profile) {
      throw new NotFoundException('Employee not found');
    }

    profile.status = status;

    if (status === EmployeeStatus.TERMINATED || status === EmployeeStatus.RETIRED) {
      profile.contractEndDate = new Date();
    }

    await profile.save();

    return { message: `Employee status updated to ${status}` };
  }
}


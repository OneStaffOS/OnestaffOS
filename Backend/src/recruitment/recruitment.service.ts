import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import { GridFSService } from './gridfs.service';
import { JobTemplate, JobTemplateDocument } from './models/job-template.schema';
import { JobRequisition, JobRequisitionDocument } from './models/job-requisition.schema';
import { Application, ApplicationDocument } from './models/application.schema';
import { ApplicationStatusHistory, ApplicationStatusHistoryDocument } from './models/application-history.schema';
import { Document, DocumentDocument } from './models/document.schema';
import { DocumentType } from './enums/document-type.enum';
import { ApplicationStage } from './enums/application-stage.enum';
import { ApplicationStatus } from './enums/application-status.enum';
import { CreateJobTemplateDto } from './dto/create-job-template.dto';
import { CreateJobRequisitionDto } from './dto/create-job-requisition.dto';
import { PublishJobDto } from './dto/publish-job.dto';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationStageDto } from './dto/update-application-stage.dto';
import { NotifyCandidateStatusDto } from './dto/notify-candidate-status.dto';
import { RejectApplicationDto } from './dto/reject-application.dto';
import { NotificationService } from '../notifications/notification.service';
import { Candidate, CandidateDocument } from '../employee-profile/models/candidate.schema';
import { EmployeeProfile, EmployeeProfileDocument } from '../employee-profile/models/employee-profile.schema';
import { EmployeeSystemRole, EmployeeSystemRoleDocument } from '../employee-profile/models/employee-system-role.schema';
import { SystemRole } from '../employee-profile/enums/employee-profile.enums';
import { Interview, InterviewDocument } from './models/interview.schema';
import { InterviewMethod } from './enums/interview-method.enum';
import { InterviewStatus } from './enums/interview-status.enum';
import { AssessmentResult, AssessmentResultDocument } from './models/assessment-result.schema';
import { Referral, ReferralDocument } from './models/referral.schema';
import { Offer, OfferDocument } from './models/offer.schema';
import { Contract, ContractDocument } from './models/contract.schema';
import { Onboarding, OnboardingDocument } from './models/onboarding.schema';
import { CreateOfferDto } from './dto/create-offer.dto';
import { ProcessOfferApprovalDto } from './dto/process-offer-approval.dto';
import { RespondToOfferDto } from './dto/respond-to-offer.dto';
import { OfferResponseStatus } from './enums/offer-response-status.enum';
import { OfferFinalStatus } from './enums/offer-final-status.enum';
import { ApprovalStatus } from './enums/approval-status.enum';
import { TerminationRequest, TerminationRequestDocument } from './models/termination-request.schema';
import { ClearanceChecklist, ClearanceChecklistDocument } from './models/clearance-checklist.schema';
import { TerminationStatus } from './enums/termination-status.enum';
import { TerminationInitiation } from './enums/termination-initiation.enum';
import { CreateTerminationDto } from './dto/create-termination.dto';
import { UpdateTerminationDto } from './dto/update-termination.dto';
import { UpdateClearanceItemDto, UpdateEquipmentReturnDto } from './dto/update-clearance.dto';
import { employeeSigningBonus, employeeSigningBonusDocument } from '../payroll-execution/models/EmployeeSigningBonus.schema';
import { signingBonus, signingBonusDocument } from '../payroll-configuration/models/signingBonus.schema';
import { payGrade, payGradeDocument } from '../payroll-configuration/models/payGrades.schema';
import { taxRules, taxRulesDocument } from '../payroll-configuration/models/taxRules.schema';
import { insuranceBrackets, insuranceBracketsDocument } from '../payroll-configuration/models/insuranceBrackets.schema';
import { BonusStatus, BenefitStatus } from '../payroll-execution/enums/payroll-execution-enum';
import { ConfigStatus } from '../payroll-configuration/enums/payroll-configuration-enums';
import { LeavesService } from '../leaves/leaves.service';
import { EmployeeTerminationResignation, EmployeeTerminationResignationDocument } from '../payroll-execution/models/EmployeeTerminationResignation.schema';
import { terminationAndResignationBenefits, terminationAndResignationBenefitsDocument } from '../payroll-configuration/models/terminationAndResignationBenefits';
import { allowance, allowanceDocument } from '../payroll-configuration/models/allowance.schema';

@Injectable()
export class RecruitmentService {
  constructor(
    @InjectModel(JobTemplate.name)
    private jobTemplateModel: Model<JobTemplateDocument>,
    @InjectModel(JobRequisition.name)
    private jobRequisitionModel: Model<JobRequisitionDocument>,
    @InjectModel(Application.name)
    private applicationModel: Model<ApplicationDocument>,
    @InjectModel(ApplicationStatusHistory.name)
    private applicationHistoryModel: Model<ApplicationStatusHistoryDocument>,
    @InjectModel(Document.name)
    private documentModel: Model<DocumentDocument>,
    @InjectModel(Candidate.name)
    private candidateModel: Model<CandidateDocument>,
    @InjectModel(EmployeeProfile.name)
    private employeeProfileModel: Model<EmployeeProfileDocument>,
    @InjectModel(Interview.name)
    private interviewModel: Model<InterviewDocument>,
    @InjectModel(AssessmentResult.name)
    private assessmentResultModel: Model<AssessmentResultDocument>,
    @InjectModel(Referral.name)
    private referralModel: Model<ReferralDocument>,
    @InjectModel(Offer.name)
    private offerModel: Model<OfferDocument>,
    @InjectModel(Contract.name)
    private contractModel: Model<ContractDocument>,
    @InjectModel(Onboarding.name)
    private onboardingModel: Model<OnboardingDocument>,
    @InjectModel(EmployeeSystemRole.name)
    private employeeSystemRoleModel: Model<EmployeeSystemRoleDocument>,
    @InjectModel(TerminationRequest.name)
    private terminationModel: Model<TerminationRequestDocument>,
    @InjectModel(ClearanceChecklist.name)
    private clearanceModel: Model<ClearanceChecklistDocument>,
    @InjectModel(employeeSigningBonus.name)
    private employeeSigningBonusModel: Model<employeeSigningBonusDocument>,
    @InjectModel(signingBonus.name)
    private signingBonusModel: Model<signingBonusDocument>,
    @InjectModel(payGrade.name)
    private payGradeModel: Model<payGradeDocument>,
    @InjectModel(taxRules.name)
    private taxRulesModel: Model<taxRulesDocument>,
    @InjectModel(insuranceBrackets.name)
    private insuranceBracketsModel: Model<insuranceBracketsDocument>,
    @InjectModel(EmployeeTerminationResignation.name)
    private employeeTerminationModel: Model<EmployeeTerminationResignationDocument>,
    @InjectModel(terminationAndResignationBenefits.name)
    private terminationBenefitsModel: Model<terminationAndResignationBenefitsDocument>,
    @InjectModel(allowance.name)
    private allowanceModel: Model<allowanceDocument>,
    private readonly gridFSService: GridFSService,
    private readonly notificationService: NotificationService,
    private readonly leavesService: LeavesService,
  ) {}

  // ==================== JOB TEMPLATES ====================

  async createJobTemplate(dto: CreateJobTemplateDto): Promise<JobTemplate> {
    const template = new this.jobTemplateModel(dto);
    return template.save();
  }

  async findAllJobTemplates(): Promise<JobTemplate[]> {
    return this.jobTemplateModel.find().sort({ createdAt: -1 }).exec();
  }

  async findJobTemplateById(id: string): Promise<JobTemplate> {
    const template = await this.jobTemplateModel.findById(id).exec();
    if (!template) {
      throw new NotFoundException(`Job template with ID ${id} not found`);
    }
    return template;
  }

  async updateJobTemplate(id: string, dto: Partial<CreateJobTemplateDto>): Promise<JobTemplate> {
    const template = await this.jobTemplateModel
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();
    if (!template) {
      throw new NotFoundException(`Job template with ID ${id} not found`);
    }
    return template;
  }

  async deleteJobTemplate(id: string): Promise<{ deleted: boolean }> {
    const result = await this.jobTemplateModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Job template with ID ${id} not found`);
    }
    return { deleted: true };
  }

  // ==================== JOB REQUISITIONS ====================

  async createJobRequisition(dto: CreateJobRequisitionDto): Promise<JobRequisition> {
    // Generate unique requisitionId
    const count = await this.jobRequisitionModel.countDocuments().exec();
    const requisitionId = `JOB-${String(count + 1).padStart(3, '0')}`;
    
    // Convert string IDs to ObjectIds and prepare data
    const requisitionData: any = {
      ...dto,
      requisitionId,
      templateId: new Types.ObjectId(dto.templateId),
      hiringManagerId: new Types.ObjectId(dto.hiringManagerId),
    };
    
    if (dto.expiryDate) {
      requisitionData.expiryDate = new Date(dto.expiryDate);
    }
    
    const requisition = new this.jobRequisitionModel(requisitionData);
    return requisition.save();
  }

  async findAllJobRequisitions(): Promise<JobRequisition[]> {
    return this.jobRequisitionModel
      .find()
      .populate('templateId')
      .populate('hiringManagerId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findJobRequisitionById(id: string): Promise<JobRequisition> {
    const requisition = await this.jobRequisitionModel
      .findById(id)
      .populate('templateId')
      .populate('hiringManagerId', 'firstName lastName email')
      .exec();
    if (!requisition) {
      throw new NotFoundException(`Job requisition with ID ${id} not found`);
    }
    return requisition;
  }

  async updateJobRequisition(id: string, dto: Partial<CreateJobRequisitionDto>): Promise<JobRequisition> {
    // Convert string IDs to ObjectIds if present in the update
    const updateData: any = { ...dto };
    
    if (dto.templateId) {
      updateData.templateId = new Types.ObjectId(dto.templateId);
    }
    if (dto.hiringManagerId) {
      updateData.hiringManagerId = new Types.ObjectId(dto.hiringManagerId);
    }
    
    const requisition = await this.jobRequisitionModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('templateId')
      .populate('hiringManagerId', 'firstName lastName email')
      .exec();
    if (!requisition) {
      throw new NotFoundException(`Job requisition with ID ${id} not found`);
    }
    return requisition;
  }

  async publishJobRequisition(id: string, dto: PublishJobDto): Promise<JobRequisition> {
    const updateData: any = { publishStatus: dto.publishStatus };
    
    // Set posting date when publishing
    if (dto.publishStatus === 'published') {
      updateData.postingDate = new Date();
    }

    const requisition = await this.jobRequisitionModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('templateId')
      .populate('hiringManagerId', 'firstName lastName email')
      .exec();
      
    if (!requisition) {
      throw new NotFoundException(`Job requisition with ID ${id} not found`);
    }
    return requisition;
  }

  async deleteJobRequisition(id: string): Promise<{ deleted: boolean }> {
    const result = await this.jobRequisitionModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Job requisition with ID ${id} not found`);
    }
    return { deleted: true };
  }

  // Get published jobs for careers page
  async getPublishedJobs(): Promise<JobRequisition[]> {
    return this.jobRequisitionModel
      .find({ publishStatus: 'published' })
      .populate('templateId')
      .sort({ postingDate: -1 })
      .exec();
  }

  // ==================== APPLICATIONS ====================

  async createApplication(
    data: {
      candidateId: string;
      requisitionId: string;
      coverLetter?: string;
    },
    cvFile: Express.Multer.File,
  ): Promise<Application> {
    const candidateObjectId = new Types.ObjectId(data.candidateId);

    // Check if candidate exists, if not create from employee profile
    let candidate = await this.candidateModel.findById(candidateObjectId).exec();
    
    if (!candidate) {
      // Get user/employee profile data
      const employeeProfile = await this.employeeProfileModel.findById(candidateObjectId).exec();
      
      if (!employeeProfile) {
        throw new NotFoundException(`User profile not found for ID ${data.candidateId}`);
      }

      // Generate unique candidate number
      const candidateCount = await this.candidateModel.countDocuments().exec();
      const candidateNumber = `CAN${String(candidateCount + 1).padStart(6, '0')}`;

      // Create candidate record from employee profile
      candidate = new this.candidateModel({
        _id: candidateObjectId,
        candidateNumber,
        firstName: employeeProfile.firstName,
        lastName: employeeProfile.lastName,
        middleName: employeeProfile.middleName,
        fullName: employeeProfile.fullName || `${employeeProfile.firstName} ${employeeProfile.lastName}`,
        nationalId: employeeProfile.nationalId,
        personalEmail: employeeProfile.personalEmail,
        mobilePhone: employeeProfile.mobilePhone,
        homePhone: employeeProfile.homePhone,
        gender: employeeProfile.gender,
        maritalStatus: employeeProfile.maritalStatus,
        dateOfBirth: employeeProfile.dateOfBirth,
        address: employeeProfile.address,
        profilePictureUrl: employeeProfile.profilePictureUrl,
        applicationDate: new Date(),
        status: 'APPLIED',
      });
      
      await candidate.save();
    }

    // File is already in memory as buffer (MemoryStorage)
    const fileBuffer = cvFile.buffer;

    // Upload to GridFS
    const gridFsFileId = await this.gridFSService.uploadFile(
      fileBuffer,
      cvFile.originalname,
      {
        candidateId: data.candidateId,
        mimeType: cvFile.mimetype,
        uploadedAt: new Date(),
      }
    );

    // Save CV document metadata to database
    const cvDocument = new this.documentModel({
      ownerId: candidateObjectId,
      type: DocumentType.CV,
      fileName: cvFile.originalname,
      gridFsFileId: gridFsFileId,
      mimeType: cvFile.mimetype,
      fileSize: cvFile.size,
      uploadedAt: new Date(),
    });
    await cvDocument.save();

    // Create application record
    const application = new this.applicationModel({
      candidateId: candidateObjectId,
      requisitionId: new Types.ObjectId(data.requisitionId),
      currentStage: ApplicationStage.SCREENING,
      status: ApplicationStatus.SUBMITTED,
      coverLetter: data.coverLetter,
    });
    
    return application.save();
  }

  // ==================== APPLICATION STATUS MANAGEMENT ====================

  async updateApplicationStatus(
    applicationId: string,
    dto: UpdateApplicationStageDto,
    updatedBy: string,
  ): Promise<Application> {
    const application = await this.applicationModel.findById(applicationId).exec();
    if (!application) {
      throw new NotFoundException(`Application with ID ${applicationId} not found`);
    }

    // Record status change in history
    const history = new this.applicationHistoryModel({
      applicationId: new Types.ObjectId(applicationId),
      oldStage: application.currentStage,
      newStage: dto.currentStage,
      oldStatus: application.status,
      newStatus: dto.status,
      changedBy: new Types.ObjectId(updatedBy),
    });
    await history.save();

    // Update application
    application.currentStage = dto.currentStage;
    application.status = dto.status;
    await application.save();

    // Send notification to candidate about status change
    await this.notifyCandidateOfStatusChange(applicationId, dto.status);

    // Return populated application for frontend
    const updatedApplication = await this.applicationModel
      .findById(applicationId)
      .populate('candidateId', 'firstName lastName email personalEmail phoneNumber')
      .populate('requisitionId', 'jobTitle department requisitionId departmentId')
      .exec();
    
    if (!updatedApplication) {
      throw new NotFoundException(`Application with ID ${applicationId} not found after update`);
    }

    return updatedApplication;
  }

  async notifyCandidateOfStatusChange(
    applicationId: string,
    newStatus: ApplicationStatus,
  ): Promise<void> {
    const application = await this.applicationModel
      .findById(applicationId)
      .populate('requisitionId')
      .exec();
    
    if (!application) {
      return;
    }

    const candidate = await this.candidateModel.findById(application.candidateId).exec();
    if (!candidate) {
      return;
    }

    const jobRequisition = application.requisitionId as any;
    const jobTitle = jobRequisition?.jobTitle || 'the position';

    // Create status-specific message
    let message = '';
    let title = '';

    switch (newStatus) {
      case ApplicationStatus.SUBMITTED:
        title = 'Application Received';
        message = `Thank you for applying to ${jobTitle}. We have received your application and will review it shortly.`;
        break;
      case ApplicationStatus.IN_PROCESS:
        title = 'Application Under Review';
        message = `Your application for ${jobTitle} is currently under review. We will contact you soon with next steps.`;
        break;
      case ApplicationStatus.OFFER:
        title = 'Offer Extended';
        message = `Congratulations! We would like to extend an offer for the ${jobTitle} position. Please check your email for details.`;
        break;
      case ApplicationStatus.HIRED:
        title = 'Welcome Aboard!';
        message = `Congratulations! You have been hired for the ${jobTitle} position. Our HR team will contact you with onboarding details.`;
        break;
      case ApplicationStatus.REJECTED:
        title = 'Application Status Update';
        message = `Thank you for your interest in the ${jobTitle} position. After careful consideration, we have decided to move forward with other candidates. We appreciate your time and wish you the best in your job search.`;
        break;
      default:
        title = 'Application Status Update';
        message = `Your application for ${jobTitle} has been updated.`;
    }

    // Send notification - Note: Candidates might not be in EmployeeProfile
    // We'll create a targeted notification
    try {
      // For now, we'll use a simple system notification approach
      // In a real system, this would send email/SMS to the candidate
      console.log(`Notification to candidate ${candidate.personalEmail}: ${title} - ${message}`);
      
      // If candidate has an associated user account, send in-app notification
      // This would work if the candidate is also in the system as an employee/user
      // For pure candidates, you'd typically send email/SMS through external services
    } catch (error) {
      console.error('Error sending candidate notification:', error);
    }
  }

  async sendCustomNotificationToCandidate(
    applicationId: string,
    dto: NotifyCandidateStatusDto,
  ): Promise<void> {
    const application = await this.applicationModel
      .findById(applicationId)
      .populate('requisitionId')
      .exec();
    
    if (!application) {
      throw new NotFoundException(`Application with ID ${applicationId} not found`);
    }

    const candidate = await this.candidateModel.findById(application.candidateId).exec();
    if (!candidate) {
      throw new NotFoundException(`Candidate not found`);
    }

    const jobRequisition = application.requisitionId as any;
    const jobTitle = jobRequisition?.jobTitle || 'your application';

    // Send custom message to candidate
    console.log(`Custom notification to candidate ${candidate.personalEmail}: ${dto.message}`);
  }

  async getAllApplications(): Promise<any[]> {
    const applications = await this.applicationModel
      .find()
      .populate({
        path: 'candidateId',
        select: 'firstName lastName personalEmail mobilePhone candidateNumber'
      })
      .populate({
        path: 'requisitionId',
        select: 'requisitionId location openings publishStatus templateId',
        populate: {
          path: 'templateId',
          select: 'title department'
        }
      })
      .sort({ createdAt: -1 })
      .exec();

    // Get all referrals
    const referrals = await this.referralModel.find().exec();
    const referralCandidateIds = new Set(referrals.map(r => r.candidateId.toString()));

    // Attach isReferral flag and sort: referrals first, then by creation date
    const applicationsWithReferralFlag = applications.map(app => {
      const appObj: any = app.toObject();
      return {
        ...appObj,
        isReferral: referralCandidateIds.has(app.candidateId?._id?.toString() || '')
      };
    });

    // Sort: referrals first, then non-referrals, both by date descending
    return applicationsWithReferralFlag.sort((a: any, b: any) => {
      if (a.isReferral && !b.isReferral) return -1;
      if (!a.isReferral && b.isReferral) return 1;
      return new Date(b.createdAt || b._id.getTimestamp()).getTime() - 
             new Date(a.createdAt || a._id.getTimestamp()).getTime();
    });
  }

  async getCandidateApplications(candidateId: string): Promise<Application[]> {
    return this.applicationModel
      .find({ candidateId: new Types.ObjectId(candidateId) })
      .populate('requisitionId')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getMyApplications(userId: string): Promise<Application[]> {
    // Applications use candidateId which could be the same as userId for registered users
    // or a separate Candidate record ID
    return this.applicationModel
      .find({ candidateId: new Types.ObjectId(userId) })
      .populate('requisitionId')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getApplicationHistory(applicationId: string): Promise<ApplicationStatusHistory[]> {
    return this.applicationHistoryModel
      .find({ applicationId: new Types.ObjectId(applicationId) })
      .populate('changedBy', 'firstName lastName')
      .sort({ createdAt: 1 })
      .exec();
  }

  // ==================== AUTOMATED REJECTION ====================

  async rejectApplication(
    applicationId: string,
    dto: RejectApplicationDto,
    rejectedBy: string,
  ): Promise<Application> {
    const application = await this.applicationModel
      .findById(applicationId)
      .populate('requisitionId')
      .exec();
    
    if (!application) {
      throw new NotFoundException(`Application with ID ${applicationId} not found`);
    }

    // Record status change in history
    const history = new this.applicationHistoryModel({
      applicationId: new Types.ObjectId(applicationId),
      oldStage: application.currentStage,
      newStage: application.currentStage, // Stage stays the same
      oldStatus: application.status,
      newStatus: ApplicationStatus.REJECTED,
      changedBy: new Types.ObjectId(rejectedBy),
    });
    await history.save();

    // Update application status
    application.status = ApplicationStatus.REJECTED;
    const updatedApplication = await application.save();

    // Send rejection notification to candidate
    await this.sendRejectionNotification(
      application,
      dto.customMessage,
      dto.reason,
    );

    return updatedApplication;
  }

  private async sendRejectionNotification(
    application: any,
    customMessage?: string,
    reason?: string,
  ): Promise<void> {
    const candidate = await this.candidateModel.findById(application.candidateId).exec();
    if (!candidate) {
      return;
    }

    const jobRequisition = application.requisitionId;
    const jobTitle = jobRequisition?.jobTitle || 'the position';
    const candidateName = `${candidate.firstName} ${candidate.lastName}`;

    let subject = `Application Status Update - ${jobTitle}`;
    let message = '';

    if (customMessage) {
      // Use custom message if provided
      message = customMessage;
    } else {
      // Use default message with reason if provided
      const reasonText = reason || 'we have decided to move forward with other candidates whose qualifications more closely match our current needs';
      message = `Dear ${candidateName},\n\nThank you for your interest in the ${jobTitle} position. After careful consideration, ${reasonText}.\n\nWe appreciate the time and effort you invested in your application and wish you the best in your job search.\n\nBest regards,\nHuman Resources Team`;
    }

    // Log the rejection notification (in production, this would send email/SMS)
    console.log(`
=== REJECTION NOTIFICATION ===
To: ${candidate.personalEmail}
Subject: ${subject}
Message:
${message}
============================
    `);
  }

  async bulkRejectApplications(
    applicationIds: string[],
    dto: RejectApplicationDto,
    rejectedBy: string,
  ): Promise<{ rejected: number; failed: number }> {
    let rejected = 0;
    let failed = 0;

    for (const applicationId of applicationIds) {
      try {
        await this.rejectApplication(applicationId, dto, rejectedBy);
        rejected++;
      } catch (error) {
        failed++;
        console.error(`Failed to reject application ${applicationId}:`, error);
      }
    }

    return { rejected, failed };
  }

  // ==================== INTERVIEW SCHEDULING ====================

  async scheduleInterviewSlots(
    applicationId: string,
    data: {
      stage: ApplicationStage;
      method: InterviewMethod;
      timeSlots: Date[];
      panel?: string[];
      videoLink?: string;
    },
  ): Promise<Interview[]> {
    const application = await this.applicationModel
      .findById(applicationId)
      .populate('candidateId')
      .populate('requisitionId')
      .exec();

    if (!application) {
      throw new NotFoundException(`Application with ID ${applicationId} not found`);
    }

    // Create interview records for each time slot
    const interviews: Interview[] = [];
    
    for (const timeSlot of data.timeSlots) {
      const interview = new this.interviewModel({
        applicationId: new Types.ObjectId(applicationId),
        stage: data.stage,
        scheduledDate: timeSlot,
        method: data.method,
        panel: data.panel?.map(id => new Types.ObjectId(id)) || [],
        videoLink: data.videoLink,
        status: InterviewStatus.SCHEDULED,
      });
      
      const savedInterview = await interview.save();
      interviews.push(savedInterview);
    }

    // Send notifications to panel members
    if (data.panel && data.panel.length > 0) {
      const candidate = application.candidateId as any;
      const candidateName = candidate ? `${candidate.firstName} ${candidate.lastName}` : 'Candidate';
      
      for (const panelMemberId of data.panel) {
        const timeSlotsList = data.timeSlots
          .map((slot, idx) => `${idx + 1}. ${new Date(slot).toLocaleString()}`)
          .join('\n');

        await this.notificationService.createNotification('SYSTEM', {
          title: 'Interview Panel Assignment',
          message: `You have been assigned as an interviewer for ${candidateName}. Interview time slots:\n\n${timeSlotsList}\n\nMethod: ${data.method}${data.videoLink ? `\nVideo Link: ${data.videoLink}` : ''}`,
          targetEmployeeIds: [panelMemberId],
        });
      }
    }

    // Notify candidate about interview invitation
    const candidate = application.candidateId as any;
    if (candidate) {
      const timeSlotsList = data.timeSlots
        .map((slot, idx) => `${idx + 1}. ${new Date(slot).toLocaleString()}`)
        .join('\n');

      await this.notificationService.createNotification('SYSTEM', {
        title: 'Interview Invitation',
        message: `You have been invited for a ${data.stage.replace('_', ' ')} interview. Please select one of the following time slots:\n\n${timeSlotsList}\n\nMethod: ${data.method}${data.videoLink ? `\nVideo Link: ${data.videoLink}` : ''}`,
        targetEmployeeIds: [candidate._id.toString()],
      });
    }

    return interviews;
  }

  async getApplicationInterviews(applicationId: string): Promise<Interview[]> {
    return this.interviewModel
      .find({ applicationId: new Types.ObjectId(applicationId) })
      .populate('panel', 'firstName lastName')
      .sort({ scheduledDate: 1 })
      .exec();
  }

  async confirmInterviewSlot(
    interviewId: string,
    candidateId: string,
  ): Promise<{ confirmed: Interview; cancelled: Interview[] }> {
    // Get the selected interview
    const selectedInterview = await this.interviewModel.findById(interviewId).exec();
    
    if (!selectedInterview) {
      throw new NotFoundException(`Interview with ID ${interviewId} not found`);
    }

    // Verify the interview belongs to this candidate's application
    const application = await this.applicationModel
      .findById(selectedInterview.applicationId)
      .exec();

    if (!application || application.candidateId.toString() !== candidateId) {
      throw new NotFoundException('Interview not found or access denied');
    }

    // Mark this interview as confirmed by adding candidate feedback
    selectedInterview.candidateFeedback = 'CONFIRMED';
    await selectedInterview.save();

    // Cancel all other interview slots for this application
    const cancelledInterviews = await this.interviewModel
      .find({
        applicationId: selectedInterview.applicationId,
        _id: { $ne: new Types.ObjectId(interviewId) },
        status: InterviewStatus.SCHEDULED,
      })
      .exec();

    for (const interview of cancelledInterviews) {
      interview.status = InterviewStatus.CANCELLED;
      await interview.save();
    }

    return {
      confirmed: selectedInterview,
      cancelled: cancelledInterviews,
    };
  }

  async provideInterviewFeedback(
    interviewId: string,
    interviewerId: string,
    data: {
      score: number;
      comments?: string;
    },
  ): Promise<AssessmentResult> {
    const interview = await this.interviewModel.findById(interviewId).exec();
    
    if (!interview) {
      throw new NotFoundException(`Interview with ID ${interviewId} not found`);
    }

    // Check if feedback already exists for this interviewer
    const existingFeedback = await this.assessmentResultModel
      .findOne({
        interviewId: new Types.ObjectId(interviewId),
        interviewerId: new Types.ObjectId(interviewerId),
      })
      .exec();

    if (existingFeedback) {
      // Update existing feedback
      existingFeedback.score = data.score;
      existingFeedback.comments = data.comments;
      return existingFeedback.save();
    }

    // Create new feedback
    const assessmentResult = new this.assessmentResultModel({
      interviewId: new Types.ObjectId(interviewId),
      interviewerId: new Types.ObjectId(interviewerId),
      score: data.score,
      comments: data.comments,
    });

    const savedResult = await assessmentResult.save();

    // Update interview to mark it as completed if not already
    if (interview.status === InterviewStatus.SCHEDULED) {
      interview.status = InterviewStatus.COMPLETED;
      interview.feedbackId = savedResult._id as Types.ObjectId;
      await interview.save();
    }

    return savedResult;
  }

  async getInterviewFeedback(interviewId: string): Promise<AssessmentResult[]> {
    return this.assessmentResultModel
      .find({ interviewId: new Types.ObjectId(interviewId) })
      .populate('interviewerId', 'firstName lastName')
      .exec();
  }

  async getApplicationInterviewsWithFeedback(applicationId: string): Promise<any[]> {
    const interviews = await this.interviewModel
      .find({ applicationId: new Types.ObjectId(applicationId) })
      .populate('panel', 'firstName lastName personalEmail')
      .sort({ scheduledDate: 1 })
      .exec();

    // Fetch feedback for each interview
    const interviewsWithFeedback = await Promise.all(
      interviews.map(async (interview) => {
        const feedback = await this.assessmentResultModel
          .find({ interviewId: interview._id })
          .populate('interviewerId', 'firstName lastName')
          .exec();
        
        return {
          ...interview.toObject(),
          feedback,
          averageScore: feedback.length > 0
            ? feedback.reduce((sum, f) => sum + f.score, 0) / feedback.length
            : null,
        };
      }),
    );

    return interviewsWithFeedback;
  }

  // ==================== REFERRAL MANAGEMENT ====================

  async tagCandidateAsReferral(
    applicationId: string,
    referringEmployeeId: string,
    role?: string,
    level?: string
  ): Promise<Referral> {
    // Get application to extract candidateId
    const application = await this.applicationModel.findById(applicationId).exec();
    if (!application) {
      throw new NotFoundException(`Application with ID ${applicationId} not found`);
    }

    const candidateId = application.candidateId.toString();

    // Check if referral already exists
    const existing = await this.referralModel.findOne({
      candidateId: new Types.ObjectId(candidateId)
    }).exec();

    if (existing) {
      // Update existing referral
      existing.referringEmployeeId = new Types.ObjectId(referringEmployeeId);
      if (role) existing.role = role;
      if (level) existing.level = level;
      return existing.save();
    }

    // Create new referral
    const referral = new this.referralModel({
      candidateId: new Types.ObjectId(candidateId),
      referringEmployeeId: new Types.ObjectId(referringEmployeeId),
      role,
      level
    });

    return referral.save();
  }

  async removeReferralTag(applicationId: string): Promise<{ deleted: boolean }> {
    // Get application to extract candidateId
    const application = await this.applicationModel.findById(applicationId).exec();
    if (!application) {
      throw new NotFoundException(`Application with ID ${applicationId} not found`);
    }

    const candidateId = application.candidateId.toString();

    const result = await this.referralModel.findOneAndDelete({
      candidateId: new Types.ObjectId(candidateId)
    }).exec();

    return { deleted: !!result };
  }

  async isReferral(candidateId: string): Promise<boolean> {
    const referral = await this.referralModel.findOne({
      candidateId: new Types.ObjectId(candidateId)
    }).exec();

    return !!referral;
  }

  async getReferralInfo(applicationId: string): Promise<Referral | null> {
    // Get application to extract candidateId
    const application = await this.applicationModel.findById(applicationId).exec();
    if (!application) {
      throw new NotFoundException(`Application with ID ${applicationId} not found`);
    }

    const candidateId = application.candidateId.toString();

    return this.referralModel
      .findOne({ candidateId: new Types.ObjectId(candidateId) })
      .populate({
        path: 'referringEmployeeId',
        select: 'firstName lastName role'
      })
      .exec();
  }

  // ==================== JOB OFFERS ====================

  async createOffer(dto: CreateOfferDto, hrEmployeeId: string): Promise<Offer> {
    // Verify application exists
    const application = await this.applicationModel.findById(dto.applicationId).exec();
    if (!application) {
      throw new NotFoundException(`Application with ID ${dto.applicationId} not found`);
    }

    // Verify candidate exists
    const candidate = await this.candidateModel.findById(dto.candidateId).exec();
    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${dto.candidateId} not found`);
    }

    // Create offer
    const offer = new this.offerModel({
      applicationId: new Types.ObjectId(dto.applicationId),
      candidateId: new Types.ObjectId(dto.candidateId),
      hrEmployeeId: new Types.ObjectId(hrEmployeeId),
      grossSalary: dto.grossSalary,
      signingBonus: dto.signingBonus,
      benefits: dto.benefits,
      conditions: dto.conditions,
      insurances: dto.insurances,
      content: dto.content,
      role: dto.role,
      deadline: dto.deadline,
      applicantResponse: OfferResponseStatus.PENDING,
      finalStatus: OfferFinalStatus.PENDING,
      approvers: [],
    });

    const savedOffer = await offer.save();

    // Create signing bonus record in DRAFT status if signing bonus is provided
    if (dto.signingBonus && dto.signingBonus > 0) {
      try {
        const signingBonusRecord = new this.signingBonusModel({
          positionName: dto.role,
          amount: dto.signingBonus,
          status: ConfigStatus.DRAFT,
          createdBy: new Types.ObjectId(hrEmployeeId),
        });
        await signingBonusRecord.save();
      } catch (error) {
        // Log error but don't fail the offer creation
        console.error('Failed to create signing bonus record:', error);
      }
    }

    // Update application status to OFFER
    application.status = ApplicationStatus.OFFER;
    application.currentStage = ApplicationStage.OFFER;
    await application.save();

    // Send notification to candidate
    await this.notificationService.createNotification(hrEmployeeId, {
      title: 'Job Offer Received',
      message: `You have received a job offer for the ${dto.role} position. Please review and respond by ${new Date(dto.deadline).toLocaleDateString()}.`,
      targetEmployeeIds: [dto.candidateId],
    });

    return savedOffer;
  }

  async getAllOffers(): Promise<Offer[]> {
    return this.offerModel
      .find()
      .populate('applicationId')
      .populate('candidateId')
      .populate('hrEmployeeId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getOfferById(id: string): Promise<Offer> {
    const offer = await this.offerModel
      .findById(id)
      .populate('applicationId')
      .populate('candidateId')
      .populate('hrEmployeeId', 'firstName lastName email')
      .populate('approvers.employeeId', 'firstName lastName email')
      .exec();

    if (!offer) {
      throw new NotFoundException(`Offer with ID ${id} not found`);
    }

    return offer;
  }

  async getOffersByCandidate(candidateId: string): Promise<Offer[]> {
    return this.offerModel
      .find({ candidateId: new Types.ObjectId(candidateId) })
      .populate('applicationId')
      .populate('hrEmployeeId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getPendingOffers(): Promise<Offer[]> {
    return this.offerModel
      .find({ finalStatus: OfferFinalStatus.PENDING })
      .populate('applicationId')
      .populate('candidateId')
      .populate('hrEmployeeId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async processOfferApproval(
    offerId: string,
    employeeId: string,
    dto: ProcessOfferApprovalDto,
  ): Promise<Offer> {
    const offer = await this.offerModel.findById(offerId).exec();
    if (!offer) {
      throw new NotFoundException(`Offer with ID ${offerId} not found`);
    }

    // Add or update approver
    const existingApproverIndex = offer.approvers.findIndex(
      (a: any) => a.employeeId.toString() === employeeId
    );

    const approverData = {
      employeeId: new Types.ObjectId(employeeId),
      role: 'Manager', // Can be passed in DTO if needed
      status: dto.status,
      actionDate: new Date(),
      comment: dto.comment,
    };

    if (existingApproverIndex >= 0) {
      offer.approvers[existingApproverIndex] = approverData;
    } else {
      offer.approvers.push(approverData);
    }

    // Check if all approvers have approved
    const allApproved = offer.approvers.every(
      (a: any) => a.status === ApprovalStatus.APPROVED
    );

    const anyRejected = offer.approvers.some(
      (a: any) => a.status === ApprovalStatus.REJECTED
    );

    if (anyRejected) {
      offer.finalStatus = OfferFinalStatus.REJECTED;
      
      // Notify HR and candidate
      await this.notificationService.createNotification(employeeId, {
        title: 'Offer Rejected',
        message: `The job offer has been rejected by an approver.`,
        targetEmployeeIds: [offer.hrEmployeeId.toString()],
      });
    } else if (allApproved && offer.approvers.length > 0) {
      offer.finalStatus = OfferFinalStatus.APPROVED;

      // Notify candidate that offer is approved
      await this.notificationService.createNotification(employeeId, {
        title: 'Job Offer Approved',
        message: `Your job offer has been approved. Please review and respond.`,
        targetEmployeeIds: [offer.candidateId.toString()],
      });
    }

    return offer.save();
  }

  async respondToOffer(
    offerId: string,
    candidateId: string,
    dto: RespondToOfferDto,
  ): Promise<Offer> {
    const offer = await this.offerModel.findById(offerId).exec();
    if (!offer) {
      throw new NotFoundException(`Offer with ID ${offerId} not found`);
    }

    // Verify candidate owns this offer
    if (offer.candidateId.toString() !== candidateId) {
      throw new NotFoundException('Offer not found for this candidate');
    }

    offer.applicantResponse = dto.applicantResponse;

    if (dto.applicantResponse === OfferResponseStatus.ACCEPTED) {
      offer.candidateSignedAt = new Date();

      // Update application status to HIRED
      const application = await this.applicationModel.findById(offer.applicationId).exec();
      if (application) {
        application.status = ApplicationStatus.HIRED;
        await application.save();
      }

      // Notify HR
      await this.notificationService.createNotification('system', {
        title: 'Offer Accepted',
        message: `Candidate has accepted the job offer for ${offer.role}.`,
        targetEmployeeIds: [offer.hrEmployeeId.toString()],
      });
    } else if (dto.applicantResponse === OfferResponseStatus.REJECTED) {
      // Update application status to REJECTED
      const application = await this.applicationModel.findById(offer.applicationId).exec();
      if (application) {
        application.status = ApplicationStatus.REJECTED;
        await application.save();
      }

      // Notify HR
      await this.notificationService.createNotification('system', {
        title: 'Offer Declined',
        message: `Candidate has declined the job offer for ${offer.role}.`,
        targetEmployeeIds: [offer.hrEmployeeId.toString()],
      });
    }

    return offer.save();
  }

  async updateOffer(offerId: string, updates: Partial<CreateOfferDto>): Promise<Offer> {
    const offer = await this.offerModel
      .findByIdAndUpdate(offerId, updates, { new: true })
      .exec();

    if (!offer) {
      throw new NotFoundException(`Offer with ID ${offerId} not found`);
    }

    return offer;
  }

  async deleteOffer(offerId: string): Promise<{ deleted: boolean }> {
    const result = await this.offerModel.findByIdAndDelete(offerId).exec();
    if (!result) {
      throw new NotFoundException(`Offer with ID ${offerId} not found`);
    }
    return { deleted: true };
  }

  // Electronic Signature Methods
  async generateOfferLetter(offerId: string, hrEmployeeId: string): Promise<Contract> {
    const offer = await this.offerModel
      .findById(offerId)
      .populate('candidateId')
      .populate('hrEmployeeId')
      .exec();

    if (!offer) {
      throw new NotFoundException(`Offer with ID ${offerId} not found`);
    }

    // Check if contract already exists
    let contract = await this.contractModel.findOne({ offerId }).exec();
    
    if (!contract) {
      // Create new contract from offer
      contract = new this.contractModel({
        offerId: offer._id,
        grossSalary: offer.grossSalary,
        signingBonus: offer.signingBonus,
        role: offer.role,
        benefits: offer.benefits,
      });
    }

    // Generate PDF offer letter
    const letterUrl = await this.createOfferLetterPDF(offer, offerId);
    contract.employeeSignatureUrl = letterUrl; // Store PDF URL
    await contract.save();

    // Notify candidate
    await this.notificationService.createNotification(hrEmployeeId, {
      title: 'Offer Letter Generated',
      message: `Offer letter has been generated for ${offer.role}. You can now send it for signature.`,
      targetEmployeeIds: [hrEmployeeId],
    });

    return contract;
  }

  async sendOfferForSignature(offerId: string, hrEmployeeId: string, message?: string): Promise<Contract> {
    const offer = await this.offerModel
      .findById(offerId)
      .populate('candidateId')
      .exec();

    if (!offer) {
      throw new NotFoundException(`Offer with ID ${offerId} not found`);
    }

    const contract = await this.contractModel.findOne({ offerId }).exec();
    if (!contract) {
      throw new BadRequestException('Contract must be generated before sending for signature');
    }

    if (!contract.employeeSignatureUrl) {
      throw new BadRequestException('Offer letter must be generated before sending for signature');
    }

    // Send notification to candidate
    const candidate: any = offer.candidateId;
    const customMessage = message || 
      `Congratulations! We are pleased to extend an offer for the position of ${offer.role}. Please review and sign the offer letter by ${this.formatDate(offer.deadline)}.`;

    await this.notificationService.createNotification(hrEmployeeId, {
      title: 'Action Required: Sign Job Offer',
      message: customMessage,
      targetEmployeeIds: [candidate._id.toString()],
    });

    return contract;
  }

  async signOffer(offerId: string, candidateId: string, signature: string, signedDate: Date, ipAddress?: string): Promise<Contract> {
    const offer = await this.offerModel
      .findById(offerId)
      .populate('candidateId')
      .populate('hrEmployeeId')
      .exec();

    if (!offer) {
      throw new NotFoundException(`Offer with ID ${offerId} not found`);
    }

    if (offer.candidateId.toString() !== candidateId && (offer.candidateId as any)._id?.toString() !== candidateId) {
      throw new BadRequestException('Only the candidate can sign this offer');
    }

    // Check if deadline has passed
    if (new Date() > new Date(offer.deadline)) {
      throw new BadRequestException('Offer signing deadline has passed');
    }

    // Get or create contract
    let contract = await this.contractModel.findOne({ offerId }).exec();
    if (!contract) {
      // Create contract if it doesn't exist
      contract = new this.contractModel({
        offerId: offer._id,
        grossSalary: offer.grossSalary,
        signingBonus: offer.signingBonus,
        role: offer.role,
        benefits: offer.benefits,
      });
      
      // Generate PDF if needed
      const letterUrl = await this.createOfferLetterPDF(offer, offerId);
      contract.employeeSignatureUrl = letterUrl;
    }

    if (contract.employeeSignedAt) {
      throw new BadRequestException('Contract has already been signed');
    }

    // Update contract with signature
    contract.employeeSignedAt = new Date();
    contract.acceptanceDate = new Date();
    await contract.save();

    // Update offer status
    offer.candidateSignedAt = new Date();
    offer.applicantResponse = OfferResponseStatus.ACCEPTED;
    offer.finalStatus = OfferFinalStatus.APPROVED;
    await offer.save();

    // Update application status to HIRED
    const application = await this.applicationModel.findById(offer.applicationId).exec();
    if (application) {
      application.status = ApplicationStatus.HIRED;
      await application.save();
    }

    // Create signing bonus record if applicable
    if (contract.signingBonus && contract.signingBonus > 0) {
      try {
        const candidate = await this.candidateModel.findById(offer.candidateId).exec();
        if (candidate) {
          // Find approved signing bonus configuration for the role
          const signingBonusConfig = await this.signingBonusModel
            .findOne({ 
              positionName: contract.role,
              status: ConfigStatus.APPROVED
            })
            .exec();

          if (signingBonusConfig) {
            // Check if signing bonus record already exists
            const existingBonus = await this.employeeSigningBonusModel
              .findOne({ 
                employeeId: candidate._id,
                signingBonusId: signingBonusConfig._id
              })
              .exec();

            if (!existingBonus) {
              const signingBonusRecord = new this.employeeSigningBonusModel({
                employeeId: candidate._id,
                signingBonusId: signingBonusConfig._id,
                givenAmount: contract.signingBonus,
                status: BonusStatus.APPROVED,
              });
              await signingBonusRecord.save();
            }
          }
        }
      } catch (error) {
        console.error('Failed to create signing bonus record:', error);
        // Don't throw error - bonus creation is not critical for contract signing
      }
    }

    // Update candidate role from JOB_CANDIDATE to NEW_HIRE
    try {
      const candidate = await this.candidateModel.findById(offer.candidateId).exec();
      if (candidate) {
        // Find the EmployeeSystemRole record for this candidate
        let employeeSystemRole = await this.employeeSystemRoleModel
          .findOne({ employeeProfileId: candidate._id })
          .exec();
        
        if (employeeSystemRole) {
          // Remove JOB_CANDIDATE role
          const jobCandidateIndex = employeeSystemRole.roles.indexOf(SystemRole.JOB_CANDIDATE);
          if (jobCandidateIndex > -1) {
            employeeSystemRole.roles.splice(jobCandidateIndex, 1);
          }
          
          // Add NEW_HIRE role if not already present
          if (!employeeSystemRole.roles.includes(SystemRole.NEW_HIRE)) {
            employeeSystemRole.roles.push(SystemRole.NEW_HIRE);
          }
          
          await employeeSystemRole.save();
        }
      }
    } catch (error) {
      console.error('Failed to update candidate role to NEW_HIRE:', error);
      // Don't throw error - role update is not critical for contract signing
    }

    // Notify HR
    const hrEmployee: any = offer.hrEmployeeId;
    const hrEmployeeIdString = hrEmployee._id ? hrEmployee._id.toString() : offer.hrEmployeeId.toString();
    
    await this.notificationService.createNotification(candidateId, {
      title: 'Offer Letter Signed',
      message: `Candidate has signed the offer letter for ${offer.role}. The hiring process is complete!`,
      targetEmployeeIds: [hrEmployeeIdString],
    });

    return contract;
  }

  async getOfferLetter(offerId: string, userId: string): Promise<any> {
    const offer = await this.offerModel
      .findById(offerId)
      .populate('candidateId')
      .populate('hrEmployeeId')
      .exec();

    if (!offer) {
      throw new NotFoundException(`Offer with ID ${offerId} not found`);
    }

    // Verify access: candidate or HR
    const candidate: any = offer.candidateId;
    if (candidate._id.toString() !== userId && offer.hrEmployeeId.toString() !== userId) {
      throw new BadRequestException('Access denied');
    }

    // Get or create contract
    let contract = await this.contractModel.findOne({ offerId }).exec();
    if (!contract) {
      contract = new this.contractModel({
        offerId: offer._id,
        grossSalary: offer.grossSalary,
        signingBonus: offer.signingBonus,
        role: offer.role,
        benefits: offer.benefits,
      });
      const letterUrl = await this.createOfferLetterPDF(offer, offerId);
      contract.employeeSignatureUrl = letterUrl;
      await contract.save();
    } else if (!contract.employeeSignatureUrl) {
      const letterUrl = await this.createOfferLetterPDF(offer, offerId);
      contract.employeeSignatureUrl = letterUrl;
      await contract.save();
    }

    return {
      offerId: offer._id,
      role: offer.role,
      content: this.buildOfferLetterContent(offer),
      letterUrl: contract.employeeSignatureUrl,
      candidateSigned: !!contract.employeeSignedAt,
      signedAt: contract.employeeSignedAt,
      deadline: offer.deadline,
    };
  }

  async getSignatureStatus(offerId: string): Promise<any> {
    const offer = await this.offerModel
      .findById(offerId)
      .populate('candidateId')
      .exec();

    if (!offer) {
      throw new NotFoundException(`Offer with ID ${offerId} not found`);
    }

    const contract = await this.contractModel.findOne({ offerId }).exec();
    const candidate: any = offer.candidateId;

    return {
      offerId: offer._id,
      candidateName: `${candidate.firstName} ${candidate.lastName}`,
      candidateEmail: candidate.personalEmail,
      letterGenerated: !!contract?.employeeSignatureUrl,
      sentForSignature: !!contract,
      candidateSigned: !!contract?.employeeSignedAt,
      candidateSignedAt: contract?.employeeSignedAt,
      deadline: offer.deadline,
      daysRemaining: this.calculateDaysRemaining(offer.deadline),
      status: this.getSignatureStatusText(contract),
    };
  }

  private async createOfferLetterPDF(offer: any, offerId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        // Ensure uploads directory exists
        const uploadsDir = path.join(process.cwd(), 'uploads', 'offer-letters');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const fileName = `${offerId}_${Date.now()}.pdf`;
        const filePath = path.join(uploadsDir, fileName);
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(filePath);

        doc.pipe(stream);

        const candidate = offer.candidateId;
        const hrEmployee = offer.hrEmployeeId;

        // Header
        doc.fontSize(20).text('OFFER LETTER', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(this.formatDate(new Date()), { align: 'right' });
        doc.moveDown(2);

        // Greeting
        doc.fontSize(12).text(`Dear ${candidate.firstName} ${candidate.lastName},`);
        doc.moveDown();

        // Offer content
        doc.fontSize(11).text(offer.content, { align: 'justify' });
        doc.moveDown(2);

        // Position Details
        doc.fontSize(14).text('POSITION DETAILS:', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11);
        doc.text(`Role: ${offer.role}`);
        doc.text(`Gross Annual Salary: $${offer.grossSalary.toLocaleString()}`);
        if (offer.signingBonus) {
          doc.text(`Signing Bonus: $${offer.signingBonus.toLocaleString()}`);
        }
        doc.moveDown();

        // Benefits
        if (offer.benefits && offer.benefits.length > 0) {
          doc.fontSize(14).text('BENEFITS:', { underline: true });
          doc.moveDown(0.5);
          doc.fontSize(11);
          offer.benefits.forEach((benefit: string) => {
            doc.text(`• ${benefit}`);
          });
          doc.moveDown();
        }

        // Insurance
        if (offer.insurances) {
          doc.fontSize(14).text('INSURANCE:', { underline: true });
          doc.moveDown(0.5);
          doc.fontSize(11).text(offer.insurances);
          doc.moveDown();
        }

        // Terms & Conditions
        if (offer.conditions) {
          doc.fontSize(14).text('TERMS & CONDITIONS:', { underline: true });
          doc.moveDown(0.5);
          doc.fontSize(11).text(offer.conditions, { align: 'justify' });
          doc.moveDown();
        }

        // Deadline
        doc.moveDown();
        doc.fontSize(11).text(
          `Please sign and return this offer letter by ${this.formatDate(offer.deadline)}.`,
          { align: 'justify' }
        );
        doc.moveDown(2);

        // Closing
        doc.text('We look forward to welcoming you to our team!');
        doc.moveDown(2);
        doc.text('Best regards,');
        doc.text(`${hrEmployee?.firstName || ''} ${hrEmployee?.lastName || ''}`);
        doc.text('HR Department');

        doc.end();

        stream.on('finish', () => {
          const letterUrl = `/offer-letters/${fileName}`;
          resolve(letterUrl);
        });

        stream.on('error', (error) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  private buildOfferLetterContent(offer: any): string {
    const candidate = offer.candidateId;
    const hrEmployee = offer.hrEmployeeId;
    
    return `
OFFER LETTER

Dear ${candidate.firstName} ${candidate.lastName},

${offer.content}

POSITION DETAILS:
Role: ${offer.role}
Gross Annual Salary: $${offer.grossSalary.toLocaleString()}
${offer.signingBonus ? `Signing Bonus: $${offer.signingBonus.toLocaleString()}` : ''}

BENEFITS:
${offer.benefits?.map((b: string) => `• ${b}`).join('\n') || 'Standard company benefits package'}

INSURANCE:
${offer.insurances || 'Comprehensive insurance coverage'}

TERMS & CONDITIONS:
${offer.conditions || 'Standard employment terms apply'}

Please sign and return this offer letter by ${this.formatDate(offer.deadline)}.

We look forward to welcoming you to our team!

Best regards,
${hrEmployee?.firstName} ${hrEmployee?.lastName}
HR Department
    `.trim();
  }

  private calculateDaysRemaining(deadline: Date): number {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diff = deadlineDate.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  private getSignatureStatusText(contract: any): string {
    if (!contract) {
      return 'Draft';
    }
    if (contract.employeeSignedAt) {
      return 'Signed';
    }
    if (contract.employeeSignatureUrl) {
      return 'Awaiting Signature';
    }
    return 'Draft';
  }

  private formatDate(date: Date): string {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // ==================== ONBOARDING CHECKLISTS ====================

  async createOnboardingChecklist(data: {
    employeeId: string;
    contractId: string;
    tasks: Array<{
      name: string;
      department: string;
      deadline?: Date;
      notes?: string;
    }>;
  }): Promise<Onboarding> {
    const onboarding = new this.onboardingModel({
      employeeId: new Types.ObjectId(data.employeeId),
      contractId: new Types.ObjectId(data.contractId),
      tasks: data.tasks.map(task => ({
        ...task,
        status: 'pending',
        deadline: task.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
      })),
      completed: false,
    });
    return onboarding.save();
  }

  async getAllOnboardingChecklists(): Promise<Onboarding[]> {
    return this.onboardingModel
      .find()
      .populate('employeeId', 'firstName lastName email')
      .populate('contractId')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getOnboardingChecklistByEmployee(employeeId: string): Promise<Onboarding> {
    const checklist = await this.onboardingModel
      .findOne({ employeeId: new Types.ObjectId(employeeId) })
      .populate('employeeId', 'firstName lastName email')
      .populate('contractId')
      .exec();
    
    if (!checklist) {
      throw new NotFoundException(`Onboarding checklist not found for employee ${employeeId}`);
    }
    
    return checklist;
  }

  async updateOnboardingTask(
    checklistId: string,
    taskIndex: number,
    updates: {
      status?: string;
      completedAt?: Date;
      notes?: string;
    }
  ): Promise<Onboarding> {
    const checklist = await this.onboardingModel.findById(checklistId).exec();
    
    if (!checklist) {
      throw new NotFoundException(`Onboarding checklist with ID ${checklistId} not found`);
    }

    if (taskIndex < 0 || taskIndex >= checklist.tasks.length) {
      throw new BadRequestException('Invalid task index');
    }

    // Update task
    if (updates.status) {
      checklist.tasks[taskIndex].status = updates.status;
    }
    if (updates.completedAt) {
      checklist.tasks[taskIndex].completedAt = updates.completedAt;
    }
    if (updates.notes !== undefined) {
      checklist.tasks[taskIndex].notes = updates.notes;
    }

    // Check if all tasks are completed and have documents uploaded
    const allTasksCompletedWithDocuments = checklist.tasks.every(
      task => task.status === 'completed' && task.documentId
    );
    
    if (allTasksCompletedWithDocuments && !checklist.completed) {
      checklist.completed = true;
      checklist.completedAt = new Date();
      
      // Get employee profile
      const employee = await this.employeeProfileModel.findById(checklist.employeeId).exec();
      
      if (employee) {
        // Find the employee's contract using the contractId from the checklist
        let contract = await this.contractModel.findById(checklist.contractId).exec();
        
        // If contract not found by checklist's contractId, try to find by employeeId
        if (!contract) {
          // Find all offers for this candidate/employee
          const offers = await this.offerModel.find({ 
            candidateId: checklist.employeeId,
            finalStatus: 'approved'
          }).sort({ createdAt: -1 }).exec();
          
          if (offers.length > 0) {
            // Get the most recent offer (first in sorted array)
            const latestOffer = offers[0];
            
            // Find contract by offerId
            contract = await this.contractModel.findOne({ offerId: latestOffer._id }).exec();
          }
        }
        
        if (contract && contract.grossSalary) {
          // Auto-assign pay grade, tax rule, and insurance bracket based on salary
          await this.autoAssignPayrollConfigurations(employee, contract.grossSalary);
        }

        // Auto-assign leave entitlements
        try {
          await this.leavesService.autoAssignLeaveEntitlementsForNewHire(
            checklist.employeeId.toString()
          );
        } catch (leaveError) {
          // Don't throw - allow onboarding completion to proceed even if leave assignment fails
        }

        // Auto-assign all approved allowances to the new hire
        try {
          await this.autoAssignAllowancesToNewHire(employee);
        } catch (allowanceError) {
          // Don't throw - allow onboarding completion to proceed even if allowance assignment fails
        }
      }
      
      // Find the employee role document
      const employeeRole = await this.employeeSystemRoleModel.findOne({
        employeeProfileId: checklist.employeeId
      }).exec();
      
      if (employeeRole) {
        // Remove NEW_HIRE and add DEPARTMENT_EMPLOYEE
        const updatedRoles = employeeRole.roles.filter(r => r !== SystemRole.NEW_HIRE);
        if (!updatedRoles.includes(SystemRole.DEPARTMENT_EMPLOYEE)) {
          updatedRoles.push(SystemRole.DEPARTMENT_EMPLOYEE);
        }
        
        employeeRole.roles = updatedRoles;
        await employeeRole.save();
      }
    }

    await checklist.save();
    return checklist;
  }

  async deleteOnboardingChecklist(id: string): Promise<{ deleted: boolean }> {
    const result = await this.onboardingModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Onboarding checklist with ID ${id} not found`);
    }
    return { deleted: true };
  }

  /**
   * Auto-assign pay grade, tax rule, and insurance bracket based on employee's gross salary
   * This is called when onboarding is completed
   */
  private async autoAssignPayrollConfigurations(employee: any, grossSalary: number): Promise<void> {
    try {
      // 1. Find and assign pay grade based on gross salary range
      const payGrades = await this.payGradeModel.find({ status: ConfigStatus.APPROVED }).exec();
      let matchedPayGrade: payGradeDocument | null = null;
      
      for (const grade of payGrades) {
        // Match if employee's salary falls within the pay grade's base-gross range
        if (grossSalary >= grade.baseSalary && grossSalary <= grade.grossSalary) {
          matchedPayGrade = grade;
          break;
        }
      }
      
      if (matchedPayGrade) {
        employee.payGradeId = matchedPayGrade._id;
        await employee.save();
      }
      
      // Note: Tax rules and insurance brackets are stored for reference but not assigned to employee profile
      // They will be looked up during payroll execution based on the employee's salary
      
    } catch (error) {
      console.error('Failed to auto-assign payroll configurations:', error);
      // Don't throw error - this is not critical for onboarding completion
    }
  }

  /**
   * Auto-assign all approved allowances to new hire
   * This is called when onboarding is completed
   */
  private async autoAssignAllowancesToNewHire(employee: any): Promise<void> {
    try {
      // Fetch all approved allowances
      const approvedAllowances = await this.allowanceModel
        .find({ status: ConfigStatus.APPROVED })
        .exec();
      
      if (approvedAllowances.length === 0) {
        return;
      }

      // Calculate total allowances amount for the employee profile
      const totalAllowances = approvedAllowances.reduce((sum, allowance) => sum + allowance.amount, 0);

      // Store allowance details in employee profile for reference
      // Note: Individual allowance amounts will be retrieved during payroll execution
      // This field helps track that allowances have been assigned
      if (!employee.allowancesAssigned) {
        employee.allowancesAssigned = true;
        employee.totalAllowances = totalAllowances;
        await employee.save();
      }
    } catch (error) {
      console.error('Failed to auto-assign allowances:', error.message);
      throw error;
    }
  }

  async uploadTaskDocument(
    checklistId: string,
    taskIndex: number,
    file: Express.Multer.File,
    uploadedBy: string
  ): Promise<Onboarding> {
    const checklist = await this.onboardingModel.findById(checklistId).exec();
    
    if (!checklist) {
      throw new NotFoundException(`Onboarding checklist with ID ${checklistId} not found`);
    }

    if (taskIndex < 0 || taskIndex >= checklist.tasks.length) {
      throw new BadRequestException('Invalid task index');
    }

    // Upload document using GridFS
    const gridFsFileId = await this.gridFSService.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype
    );

    // Save document metadata
    const document = new this.documentModel({
      ownerId: new Types.ObjectId(uploadedBy),
      type: DocumentType.CERTIFICATE, // Using CERTIFICATE for onboarding documents
      fileName: file.originalname,
      gridFsFileId: gridFsFileId,
      mimeType: file.mimetype,
      fileSize: file.size,
      uploadedAt: new Date(),
    });

    const savedDocument = await document.save();

    // Update task with document reference
    checklist.tasks[taskIndex].documentId = savedDocument._id;
    
    // Check if all tasks are completed and have documents uploaded
    const allTasksCompletedWithDocuments = checklist.tasks.every(
      task => task.status === 'completed' && task.documentId
    );
    
    if (allTasksCompletedWithDocuments && !checklist.completed) {
      checklist.completed = true;
      checklist.completedAt = new Date();
      
      // Get employee profile
      const employee = await this.employeeProfileModel.findById(checklist.employeeId).exec();
      
      if (employee) {
        // Find the employee's contract using the contractId from the checklist
        let contract = await this.contractModel.findById(checklist.contractId).exec();
        
        // If contract not found by checklist's contractId, try to find by employeeId
        if (!contract) {
          // Find all offers for this candidate/employee
          const offers = await this.offerModel.find({ 
            candidateId: checklist.employeeId,
            finalStatus: 'approved'
          }).sort({ createdAt: -1 }).exec();
          
          if (offers.length > 0) {
            // Get the most recent offer (first in sorted array)
            const latestOffer = offers[0];
            
            // Find contract by offerId
            contract = await this.contractModel.findOne({ offerId: latestOffer._id }).exec();
          }
        }
        
        if (contract && contract.grossSalary) {
          // Auto-assign pay grade, tax rule, and insurance bracket based on salary
          await this.autoAssignPayrollConfigurations(employee, contract.grossSalary);
        }
      }
      
      // Find the employee role document
      const employeeRole = await this.employeeSystemRoleModel.findOne({
        employeeProfileId: checklist.employeeId
      }).exec();
      
      if (employeeRole) {
        // Remove NEW_HIRE and add DEPARTMENT_EMPLOYEE
        const updatedRoles = employeeRole.roles.filter(r => r !== SystemRole.NEW_HIRE);
        if (!updatedRoles.includes(SystemRole.DEPARTMENT_EMPLOYEE)) {
          updatedRoles.push(SystemRole.DEPARTMENT_EMPLOYEE);
        }
        
        employeeRole.roles = updatedRoles;
        await employeeRole.save();
      }
    }
    
    await checklist.save();

    return checklist;
  }

  async getTaskDocument(checklistId: string, taskIndex: number): Promise<any> {
    const checklist = await this.onboardingModel
      .findById(checklistId)
      .populate({
        path: 'tasks.documentId',
        model: 'Document',
      })
      .exec();
    
    if (!checklist) {
      throw new NotFoundException(`Onboarding checklist with ID ${checklistId} not found`);
    }

    if (taskIndex < 0 || taskIndex >= checklist.tasks.length) {
      throw new BadRequestException('Invalid task index');
    }

    const task = checklist.tasks[taskIndex];
    if (!task.documentId) {
      throw new NotFoundException('No document uploaded for this task');
    }

    return task.documentId;
  }

  // ==================== SIGNED CONTRACTS FOR HR ====================
  
  async getSignedContracts(): Promise<any[]> {
    const contracts = await this.contractModel
      .find({ employeeSignedAt: { $ne: null } })
      .populate({
        path: 'offerId',
        populate: { path: 'candidateId' }
      })
      .sort({ employeeSignedAt: -1 })
      .exec();

    return contracts.map(contract => {
      const offer: any = contract.offerId;
      const candidate: any = offer?.candidateId;
      
      return {
        _id: contract._id,
        contractId: contract._id,
        candidateName: candidate ? `${candidate.firstName} ${candidate.lastName}` : 'Unknown',
        candidateEmail: candidate?.email,
        role: contract.role,
        grossSalary: contract.grossSalary,
        signingBonus: contract.signingBonus,
        benefits: contract.benefits,
        signedAt: contract.employeeSignedAt,
        acceptanceDate: contract.acceptanceDate,
        offerId: offer?._id,
      };
    });
  }

  async getContractById(contractId: string): Promise<any> {
    const contract = await this.contractModel
      .findById(contractId)
      .populate({
        path: 'offerId',
        populate: { path: 'candidateId' }
      })
      .exec();

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    const offer: any = contract.offerId;
    const candidate: any = offer?.candidateId;

    return {
      _id: contract._id,
      contractId: contract._id,
      candidateName: candidate ? `${candidate.firstName} ${candidate.lastName}` : 'Unknown',
      candidateEmail: candidate?.email,
      candidatePhone: candidate?.phone,
      role: contract.role,
      grossSalary: contract.grossSalary,
      signingBonus: contract.signingBonus,
      benefits: contract.benefits,
      signedAt: contract.employeeSignedAt,
      acceptanceDate: contract.acceptanceDate,
      employeeSignatureUrl: contract.employeeSignatureUrl,
      offerId: offer?._id,
    };
  }

  // ==================== DEADLINE REMINDER NOTIFICATIONS ====================

  async sendTaskDeadlineReminders(): Promise<{ sent: number; errors: number }> {
    const now = new Date();
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    // Find all incomplete onboarding checklists
    const checklists = await this.onboardingModel
      .find({ completed: false })
      .populate('employeeId')
      .exec();

    let sent = 0;
    let errors = 0;

    for (const checklist of checklists) {
      const employee: any = checklist.employeeId;
      if (!employee) continue;

      for (const task of checklist.tasks) {
        if (task.status !== 'completed' && task.deadline) {
          const deadline = new Date(task.deadline);
          const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          // Send reminders at 3 days and 1 day before deadline
          if (daysUntilDeadline === 3 || daysUntilDeadline === 1) {
            try {
              await this.notificationService.createNotification(
                employee._id.toString(),
                {
                  title: `Onboarding Task Deadline Reminder: ${task.name}`,
                  message: `Your onboarding task "${task.name}" is due in ${daysUntilDeadline} day(s). Deadline: ${deadline.toLocaleDateString()}. Department: ${task.department || 'N/A'}`,
                  targetEmployeeIds: [employee._id.toString()],
                  sendAt: now.toISOString(),
                },
              );
              sent++;
            } catch (error) {
              console.error(`Failed to send reminder for task ${task.name}:`, error);
              errors++;
            }
          }

          // Send overdue notification
          if (daysUntilDeadline < 0 && task.status !== 'completed') {
            const daysOverdue = Math.abs(daysUntilDeadline);
            try {
              await this.notificationService.createNotification(
                employee._id.toString(),
                {
                  title: `OVERDUE: Onboarding Task "${task.name}"`,
                  message: `Your onboarding task "${task.name}" is ${daysOverdue} day(s) overdue. Please complete it as soon as possible.`,
                  targetEmployeeIds: [employee._id.toString()],
                  sendAt: now.toISOString(),
                },
              );
              sent++;
            } catch (error) {
              console.error(`Failed to send overdue notice for task ${task.name}:`, error);
              errors++;
            }
          }
        }
      }
    }

    return { sent, errors };
  }

  // ==================== EQUIPMENT & ACCESS TRACKING ====================

  async updateEquipmentTracking(
    onboardingId: string,
    equipment: Array<{ name: string; issued: boolean; issuedDate?: Date; serialNumber?: string }>
  ): Promise<Onboarding> {
    const checklist = await this.onboardingModel.findById(onboardingId).exec();
    if (!checklist) {
      throw new NotFoundException('Onboarding checklist not found');
    }

    // Store equipment info in notes of a dedicated task or create metadata
    // Since we can't modify schema, we'll use the tasks array with a special task
    let equipmentTaskIndex = checklist.tasks.findIndex(t => t.name === '__EQUIPMENT_TRACKING__');
    
    if (equipmentTaskIndex === -1) {
      checklist.tasks.push({
        name: '__EQUIPMENT_TRACKING__',
        department: 'Facilities',
        status: 'in_progress',
        deadline: new Date(),
        notes: JSON.stringify(equipment),
      });
    } else {
      checklist.tasks[equipmentTaskIndex].notes = JSON.stringify(equipment);
    }

    return await checklist.save();
  }

  async getEquipmentTracking(onboardingId: string): Promise<any[]> {
    const checklist = await this.onboardingModel.findById(onboardingId).exec();
    if (!checklist) {
      throw new NotFoundException('Onboarding checklist not found');
    }

    const equipmentTask = checklist.tasks.find(t => t.name === '__EQUIPMENT_TRACKING__');
    if (!equipmentTask || !equipmentTask.notes) {
      return [];
    }

    try {
      return JSON.parse(equipmentTask.notes);
    } catch {
      return [];
    }
  }

  async updateDeskAllocation(
    onboardingId: string,
    deskInfo: { building?: string; floor?: string; deskNumber?: string; allocatedDate?: Date }
  ): Promise<Onboarding> {
    const checklist = await this.onboardingModel.findById(onboardingId).exec();
    if (!checklist) {
      throw new NotFoundException('Onboarding checklist not found');
    }

    let deskTaskIndex = checklist.tasks.findIndex(t => t.name === '__DESK_ALLOCATION__');
    
    if (deskTaskIndex === -1) {
      checklist.tasks.push({
        name: '__DESK_ALLOCATION__',
        department: 'Facilities',
        status: 'in_progress',
        deadline: new Date(),
        notes: JSON.stringify(deskInfo),
      });
    } else {
      checklist.tasks[deskTaskIndex].notes = JSON.stringify(deskInfo);
    }

    return await checklist.save();
  }

  async getDeskAllocation(onboardingId: string): Promise<any> {
    const checklist = await this.onboardingModel.findById(onboardingId).exec();
    if (!checklist) {
      throw new NotFoundException('Onboarding checklist not found');
    }

    const deskTask = checklist.tasks.find(t => t.name === '__DESK_ALLOCATION__');
    if (!deskTask || !deskTask.notes) {
      return null;
    }

    try {
      return JSON.parse(deskTask.notes);
    } catch {
      return null;
    }
  }

  async updateAccessCardInfo(
    onboardingId: string,
    cardInfo: { cardNumber?: string; issuedDate?: Date; expiryDate?: Date; status?: string }
  ): Promise<Onboarding> {
    const checklist = await this.onboardingModel.findById(onboardingId).exec();
    if (!checklist) {
      throw new NotFoundException('Onboarding checklist not found');
    }

    let cardTaskIndex = checklist.tasks.findIndex(t => t.name === '__ACCESS_CARD__');
    
    if (cardTaskIndex === -1) {
      checklist.tasks.push({
        name: '__ACCESS_CARD__',
        department: 'Security',
        status: cardInfo.cardNumber ? 'completed' : 'pending',
        deadline: new Date(),
        notes: JSON.stringify(cardInfo),
      });
    } else {
      checklist.tasks[cardTaskIndex].notes = JSON.stringify(cardInfo);
      if (cardInfo.cardNumber) {
        checklist.tasks[cardTaskIndex].status = 'completed';
      }
    }

    return await checklist.save();
  }

  async getAccessCardInfo(onboardingId: string): Promise<any> {
    const checklist = await this.onboardingModel.findById(onboardingId).exec();
    if (!checklist) {
      throw new NotFoundException('Onboarding checklist not found');
    }

    const cardTask = checklist.tasks.find(t => t.name === '__ACCESS_CARD__');
    if (!cardTask || !cardTask.notes) {
      return null;
    }

    try {
      return JSON.parse(cardTask.notes);
    } catch {
      return null;
    }
  }

  // ==================== EMPLOYEE RESIGNATION ====================

  async createResignation(userId: string, dto: CreateTerminationDto) {
    const termination = new this.terminationModel({
      _id: new Types.ObjectId(),
      employeeId: new Types.ObjectId(dto.employeeId),
      initiator: TerminationInitiation.EMPLOYEE,
      reason: dto.reason,
      employeeComments: dto.employeeComments,
      contractId: new Types.ObjectId(dto.contractId),
      status: TerminationStatus.PENDING,
      terminationDate: dto.terminationDate ? new Date(dto.terminationDate) : undefined,
    });

    await termination.save();

    // Notify HR about resignation
    await this.notificationService.createNotification(
      userId,
      {
        title: 'New Resignation Request',
        message: `An employee has submitted a resignation request. Reason: ${dto.reason}`,
        targetRole: 'HR_MANAGER',
        sendAt: new Date().toISOString(),
      }
    );

    return termination;
  }

  async getMyResignationStatus(employeeId: string) {
    const terminations = await this.terminationModel
      .find({ 
        employeeId: new Types.ObjectId(employeeId),
        initiator: TerminationInitiation.EMPLOYEE 
      })
      .sort({ createdAt: -1 })
      .populate('employeeId', 'firstName lastName email')
      .populate('contractId')
      .exec();

    return terminations;
  }

  // ==================== HR TERMINATION INITIATION ====================

  async initiateTermination(userId: string, dto: CreateTerminationDto) {
    const termination = new this.terminationModel({
      _id: new Types.ObjectId(),
      employeeId: new Types.ObjectId(dto.employeeId),
      initiator: dto.initiator,
      reason: dto.reason,
      hrComments: dto.hrComments,
      contractId: new Types.ObjectId(dto.contractId),
      status: TerminationStatus.UNDER_REVIEW,
      terminationDate: dto.terminationDate ? new Date(dto.terminationDate) : undefined,
    });

    await termination.save();

    // Create clearance checklist
    await this.createClearanceChecklist(termination._id.toString());

    // Notify relevant parties
    await this.notificationService.createNotification(
      userId,
      {
        title: 'Termination Review Initiated',
        message: `A termination review has been initiated for employee. Initiator: ${dto.initiator}`,
        targetRole: 'HR_MANAGER',
        sendAt: new Date().toISOString(),
      }
    );

    return termination;
  }

  async getAllTerminations(filters?: { status?: string; initiator?: string }) {
    const query: any = {};
    
    if (filters?.status) {
      query.status = filters.status;
    }
    
    if (filters?.initiator) {
      query.initiator = filters.initiator;
    }

    const terminations = await this.terminationModel
      .find(query)
      .sort({ createdAt: -1 })
      .populate({
        path: 'employeeId',
        select: 'firstName lastName workEmail personalEmail primaryDepartmentId primaryPositionId',
        populate: [
          { path: 'primaryDepartmentId', select: 'name' },
          { path: 'primaryPositionId', select: 'title' }
        ]
      })
      .populate('contractId')
      .exec();

    return terminations;
  }

  async getTerminationById(terminationId: string) {
    const termination = await this.terminationModel
      .findById(terminationId)
      .populate({
        path: 'employeeId',
        select: 'firstName lastName workEmail personalEmail primaryDepartmentId primaryPositionId',
        populate: [
          { path: 'primaryDepartmentId', select: 'name' },
          { path: 'primaryPositionId', select: 'title' }
        ]
      })
      .populate('contractId')
      .exec();

    if (!termination) {
      throw new NotFoundException('Termination request not found');
    }

    return termination;
  }

  async updateTermination(terminationId: string, userId: string, dto: UpdateTerminationDto) {
    const termination = await this.terminationModel.findById(terminationId);
    
    if (!termination) {
      throw new NotFoundException('Termination request not found');
    }

    if (dto.hrComments !== undefined) {
      termination.hrComments = dto.hrComments;
    }

    if (dto.status) {
      termination.status = dto.status;

      // If approved, trigger offboarding notifications
      if (dto.status === TerminationStatus.APPROVED) {
        await this.triggerOffboardingNotifications(termination._id.toString(), userId);
      }
    }

    if (dto.terminationDate) {
      termination.terminationDate = new Date(dto.terminationDate);
    }

    await termination.save();

    // Notify employee of status change
    await this.notificationService.createNotification(
      userId,
      {
        title: 'Termination Request Updated',
        message: `Your termination request status has been updated to: ${dto.status || termination.status}`,
        targetEmployeeIds: [termination.employeeId.toString()],
        sendAt: new Date().toISOString(),
      }
    );

    return termination;
  }

  // ==================== CLEARANCE CHECKLIST ====================

  async createClearanceChecklist(terminationId: string, dto?: any, userId?: string) {
    const existingClearance = await this.clearanceModel.findOne({ 
      terminationId: new Types.ObjectId(terminationId) 
    });

    if (existingClearance) {
      return existingClearance;
    }

    const clearance = new this.clearanceModel({
      _id: new Types.ObjectId(),
      terminationId: new Types.ObjectId(terminationId),
      items: dto?.clearanceItems?.map(item => ({
        department: item.department,
        status: item.cleared ? ApprovalStatus.APPROVED : ApprovalStatus.PENDING,
        comments: item.comments || '',
        updatedBy: userId ? new Types.ObjectId(userId) : undefined,
        updatedAt: item.cleared ? new Date() : undefined,
      })) || [
        { department: 'IT', status: ApprovalStatus.PENDING },
        { department: 'Finance', status: ApprovalStatus.PENDING },
        { department: 'Facilities', status: ApprovalStatus.PENDING },
        { department: 'Line Manager', status: ApprovalStatus.PENDING },
        { department: 'HR', status: ApprovalStatus.PENDING },
      ],
      equipmentList: dto?.equipmentReturned ? Object.entries(dto.equipmentReturned).map(([key, value]) => ({
        name: key,
        returned: value as boolean,
      })) : [],
      cardReturned: dto?.cardReturned || false,
    });

    await clearance.save();
    return clearance;
  }

  async updateClearanceChecklist(terminationId: string, dto: any, userId: string) {
    let clearance = await this.clearanceModel.findOne({ 
      terminationId: new Types.ObjectId(terminationId) 
    });

    if (!clearance) {
      throw new NotFoundException('Clearance checklist not found');
    }

    // Update clearance items
    if (dto.clearanceItems) {
      clearance.items = dto.clearanceItems.map(item => ({
        department: item.department,
        status: item.cleared ? ApprovalStatus.APPROVED : ApprovalStatus.PENDING,
        comments: item.comments || '',
        updatedBy: new Types.ObjectId(userId),
        updatedAt: new Date(),
      }));
    }

    // Update equipment
    if (dto.equipmentReturned) {
      clearance.equipmentList = Object.entries(dto.equipmentReturned).map(([key, value]) => ({
        name: key,
        returned: value as boolean,
      }));
    }

    // Update other fields
    if (dto.cardReturned !== undefined) {
      clearance.cardReturned = dto.cardReturned;
    }

    if (dto.comments) {
      clearance.items.forEach(item => {
        if (!item.comments) item.comments = dto.comments;
      });
    }

    await clearance.save();
    return clearance;
  }

  async getClearanceChecklist(terminationId: string) {
    const clearance = await this.clearanceModel
      .findOne({ terminationId: new Types.ObjectId(terminationId) })
      .exec();

    if (!clearance) {
      throw new NotFoundException('Clearance checklist not found');
    }

    // Transform to frontend format
    return {
      _id: clearance._id,
      terminationId: clearance.terminationId,
      clearanceItems: clearance.items.map(item => ({
        department: item.department,
        cleared: item.status === ApprovalStatus.APPROVED,
        clearedBy: item.updatedBy?.toString(),
        clearedDate: item.updatedAt?.toISOString(),
        comments: item.comments,
      })),
      equipmentReturned: clearance.equipmentList.reduce((acc, item) => {
        acc[item.name] = item.returned;
        return acc;
      }, {}),
      cardReturned: clearance.cardReturned,
      finalSettlementPaid: false, // Add this field to schema if needed
      comments: clearance.items[0]?.comments || '',
    };
  }

  async updateClearanceItem(
    terminationId: string, 
    userId: string, 
    dto: UpdateClearanceItemDto
  ) {
    const clearance = await this.clearanceModel.findOne({ 
      terminationId: new Types.ObjectId(terminationId) 
    });

    if (!clearance) {
      throw new NotFoundException('Clearance checklist not found');
    }

    const itemIndex = clearance.items.findIndex(
      item => item.department === dto.department
    );

    if (itemIndex === -1) {
      throw new BadRequestException('Department not found in clearance checklist');
    }

    clearance.items[itemIndex].status = dto.status;
    clearance.items[itemIndex].comments = dto.comments;
    clearance.items[itemIndex].updatedBy = new Types.ObjectId(userId);
    clearance.items[itemIndex].updatedAt = new Date();

    await clearance.save();

    // Check if all departments approved
    const allApproved = clearance.items.every(
      item => item.status === ApprovalStatus.APPROVED
    );

    if (allApproved && clearance.cardReturned) {
      // Notify HR that clearance is complete
      await this.notificationService.createNotification(
        userId,
        {
          title: 'Employee Clearance Complete',
          message: 'All departments have approved clearance and equipment has been returned.',
          targetRole: 'HR_MANAGER',
          sendAt: new Date().toISOString(),
        }
      );
    }

    return clearance;
  }

  async updateEquipmentReturn(
    terminationId: string,
    userId: string,
    dto: UpdateEquipmentReturnDto[]
  ) {
    const clearance = await this.clearanceModel.findOne({ 
      terminationId: new Types.ObjectId(terminationId) 
    });

    if (!clearance) {
      throw new NotFoundException('Clearance checklist not found');
    }

    clearance.equipmentList = dto.map(item => ({
      equipmentId: item.equipmentId ? new Types.ObjectId(item.equipmentId) : undefined,
      name: item.equipmentId, // Store the name
      returned: item.returned,
      condition: item.condition,
    }));

    await clearance.save();
    return clearance;
  }

  async updateCardReturn(terminationId: string, cardReturned: boolean) {
    const clearance = await this.clearanceModel.findOne({ 
      terminationId: new Types.ObjectId(terminationId) 
    });

    if (!clearance) {
      throw new NotFoundException('Clearance checklist not found');
    }

    clearance.cardReturned = cardReturned;
    await clearance.save();

    return clearance;
  }

  // ==================== OFFBOARDING NOTIFICATIONS ====================

  async triggerOffboardingNotifications(terminationId: string, userId: string) {
    const termination = await this.getTerminationById(terminationId);

    // Notify IT to revoke access
    await this.notificationService.createNotification(
      userId,
      {
        title: 'System Access Revocation Required',
        message: `Please revoke system access for employee being terminated. Termination Date: ${termination.terminationDate?.toLocaleDateString() || 'TBD'}`,
        targetRole: 'SYSTEM_ADMIN',
        sendAt: new Date().toISOString(),
      }
    );

    // Notify departments for clearance
    const departments = ['IT', 'Finance', 'Facilities', 'Line Manager'];
    for (const dept of departments) {
      await this.notificationService.createNotification(
        userId,
        {
          title: `${dept} Clearance Required`,
          message: `Please complete clearance sign-off for employee termination.`,
          targetRole: 'DEPARTMENT_HEAD',
          sendAt: new Date().toISOString(),
        }
      );
    }

    // Notify payroll for final settlement
    await this.notificationService.createNotification(
      userId,
      {
        title: 'Final Pay Calculation Required',
        message: `Please calculate final pay including unused leave, deductions, and benefits for terminated employee.`,
        targetRole: 'HR_MANAGER',
        sendAt: new Date().toISOString(),
      }
    );

    return { success: true, message: 'Offboarding notifications sent' };
  }

  // ==================== STATISTICS ====================

  async getTerminationStatistics() {
    const total = await this.terminationModel.countDocuments();
    const pending = await this.terminationModel.countDocuments({ 
      status: TerminationStatus.PENDING 
    });
    const underReview = await this.terminationModel.countDocuments({ 
      status: TerminationStatus.UNDER_REVIEW 
    });
    const approved = await this.terminationModel.countDocuments({ 
      status: TerminationStatus.APPROVED 
    });
    const rejected = await this.terminationModel.countDocuments({ 
      status: TerminationStatus.REJECTED 
    });

    const byInitiator = {
      employee: await this.terminationModel.countDocuments({ 
        initiator: TerminationInitiation.EMPLOYEE 
      }),
      hr: await this.terminationModel.countDocuments({ 
        initiator: TerminationInitiation.HR 
      }),
      manager: await this.terminationModel.countDocuments({ 
        initiator: TerminationInitiation.MANAGER 
      }),
    };

    return {
      total,
      byStatus: { pending, underReview, approved, rejected },
      byInitiator,
    };
  }

  /**
   * Finalize clearance and automatically assign all termination/resignation benefits
   * This is called when all clearance requirements are completed
   */
  async finalizeClearanceAndAssignBenefits(terminationId: string, userId: string) {
    // Step 1: Verify termination exists
    const termination = await this.terminationModel.findById(terminationId).populate('employeeId');
    if (!termination) {
      throw new NotFoundException('Termination request not found');
    }

    // Step 2: Verify clearance checklist is complete
    const clearance = await this.clearanceModel.findOne({ 
      terminationId: new Types.ObjectId(terminationId) 
    });
    
    if (!clearance) {
      throw new NotFoundException('Clearance checklist not found');
    }

    // Check if all clearance items are approved
    const allCleared = clearance.items.every(item => item.status === ApprovalStatus.APPROVED);
    const allEquipmentReturned = clearance.equipmentList.every(item => item.returned);
    const cardReturned = clearance.cardReturned;

    if (!allCleared || !allEquipmentReturned || !cardReturned) {
      throw new BadRequestException('All clearance requirements must be completed before finalizing');
    }

    // Step 3: Get employee ID
    const employeeId = typeof termination.employeeId === 'string' 
      ? termination.employeeId 
      : termination.employeeId._id;

    // Step 4: Check if benefits have already been assigned
    const existingBenefits = await this.employeeTerminationModel.find({
      terminationId: new Types.ObjectId(terminationId)
    });

    if (existingBenefits.length > 0) {
      return {
        message: 'Clearance already finalized. Benefits were previously assigned.',
        benefitsCount: existingBenefits.length,
        benefits: existingBenefits
      };
    }

    // Step 5: Get all approved termination/resignation benefits
    const approvedBenefits = await this.terminationBenefitsModel.find({
      status: ConfigStatus.APPROVED
    });

    if (approvedBenefits.length === 0) {
      throw new BadRequestException('No approved termination benefits configured in the system');
    }

    // Step 6: Assign all benefits to the employee
    const assignedBenefits: EmployeeTerminationResignationDocument[] = [];
    for (const benefit of approvedBenefits) {
      try {
        const employeeBenefit = new this.employeeTerminationModel({
          _id: new Types.ObjectId(),
          employeeId: new Types.ObjectId(employeeId),
          benefitId: benefit._id,
          givenAmount: benefit.amount,
          terminationId: new Types.ObjectId(terminationId),
          status: BenefitStatus.APPROVED
        });

        await employeeBenefit.save();
        assignedBenefits.push(employeeBenefit);
      } catch (err) {
        throw new BadRequestException(`Failed to assign benefit: ${benefit.name}`);
      }
    }

    // Step 7: Update termination status to indicate clearance is complete
    termination.status = TerminationStatus.APPROVED;
    await termination.save();

    // Step 8: Create notification for employee
    try {
      await this.notificationService.createNotification(userId, {
        title: 'Termination Benefits Assigned',
        message: `Your clearance has been finalized and ${assignedBenefits.length} termination benefit(s) have been assigned to your account.`,
        targetEmployeeIds: [employeeId.toString()],
      });
    } catch (notifErr) {
      // Don't fail the whole operation if notification fails
    }

    return {
      message: 'Clearance finalized successfully',
      benefitsAssigned: assignedBenefits.length,
      totalAmount: assignedBenefits.reduce((sum, b) => sum + b.givenAmount, 0),
      benefits: assignedBenefits.map(b => ({
        id: b._id,
        benefitId: b.benefitId,
        amount: b.givenAmount,
        status: b.status
      }))
    };
  }
}

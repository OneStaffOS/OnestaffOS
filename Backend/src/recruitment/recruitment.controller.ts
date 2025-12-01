import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { RecruitmentService } from './recruitment.service';
import { CreateJobTemplateDto } from './dto/create-job-template.dto';
import { CreateJobRequisitionDto } from './dto/create-job-requisition.dto';
import { PublishJobDto } from './dto/publish-job.dto';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationStageDto } from './dto/update-application-stage.dto';
import { ScheduleInterviewDto } from './dto/schedule-interview.dto';
import { SubmitInterviewFeedbackDto } from './dto/submit-interview-feedback.dto';
import { CreateOfferDto } from './dto/create-offer.dto';
import { ProcessOfferApprovalDto } from './dto/process-offer-approval.dto';
import { RespondToOfferDto } from './dto/respond-to-offer.dto';
import { CreateContractDto } from './dto/create-contract.dto';
import { CreateTerminationRequestDto } from './dto/create-termination-request.dto';
import { ProcessTerminationDto } from './dto/process-termination.dto';
import { UpdateClearanceItemDto, UpdateEquipmentReturnDto } from './dto/update-clearance.dto';
import { NotifyCandidateStatusDto } from './dto/notify-candidate-status.dto';
import { RejectApplicationDto } from './dto/reject-application.dto';
import { TagReferralDto } from './dto/tag-referral.dto';
import { UpdateInterviewStatusDto } from './dto/update-interview-status.dto';
import { UpdateCardReturnDto } from './dto/update-card-return.dto';
import { ProcessFinalSettlementDto } from './dto/process-final-settlement.dto';
import { CreateOnboardingChecklistDto } from './dto/create-onboarding-checklist.dto';
import { AuthGuard } from '../auth/gaurds/authentication.guard';
import { authorizationGaurd } from '../auth/middleware/authorization.middleware';
import { Roles, Role } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { ApplicationStatus } from './enums/application-status.enum';
import { ApplicationStage } from './enums/application-stage.enum';
import { OfferFinalStatus } from './enums/offer-final-status.enum';
import { TerminationStatus } from './enums/termination-status.enum';
import { InterviewStatus } from './enums/interview-status.enum';

@Controller('recruitment')
@UseGuards(AuthGuard, authorizationGaurd)
export class RecruitmentController {
  constructor(private readonly recruitmentService: RecruitmentService) {}

  // ========== PHASE 1: JOB DESIGN & POSTING ==========

  /**
   * REC-003: Create job description template
   * Accessible by: HR Manager, HR Admin, System Admin
   */
  @Post('job-templates')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async createJobTemplate(@Body() createDto: CreateJobTemplateDto) {
    return this.recruitmentService.createJobTemplate(createDto);
  }

  /**
   * Get all job templates
   * Accessible by: HR roles
   */
  @Get('job-templates')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.HR_EMPLOYEE, Role.SYSTEM_ADMIN)
  async getAllJobTemplates() {
    return this.recruitmentService.getAllJobTemplates();
  }

  /**
   * Get job template by ID
   * Accessible by: HR roles
   */
  @Get('job-templates/:id')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.HR_EMPLOYEE, Role.SYSTEM_ADMIN)
  async getJobTemplateById(@Param('id') id: string) {
    return this.recruitmentService.getJobTemplateById(id);
  }

  /**
   * REC-004: Create job requisition
   * Accessible by: HR Manager, HR Admin
   */
  @Post('job-requisitions')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async createJobRequisition(@Body() createDto: CreateJobRequisitionDto) {
    return this.recruitmentService.createJobRequisition(createDto);
  }

  /**
   * Get all job requisitions
   * Accessible by: HR roles, Managers
   */
  @Get('job-requisitions')
  @Roles(
    Role.DEPARTMENT_HEAD,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async getAllJobRequisitions(@Query('publishStatus') publishStatus?: string) {
    return this.recruitmentService.getAllJobRequisitions({ publishStatus });
  }

  /**
   * Get job requisition by ID
   * Accessible by: HR roles, Managers
   */
  @Get('job-requisitions/:id')
  @Roles(
    Role.DEPARTMENT_HEAD,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async getJobRequisitionById(@Param('id') id: string) {
    return this.recruitmentService.getJobRequisitionById(id);
  }

  /**
   * REC-023: Publish job to careers page
   * Accessible by: HR Employee, HR Manager, HR Admin
   */
  @Put('job-requisitions/:id/publish')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.HR_EMPLOYEE, Role.SYSTEM_ADMIN)
  async publishJob(@Param('id') id: string, @Body() publishDto: PublishJobDto) {
    return this.recruitmentService.publishJob(id, publishDto);
  }

  /**
   * REC-023: Unpublish/update job status (PATCH for partial updates)
   * Accessible by: HR Employee, HR Manager, HR Admin
   */
  @Patch('job-requisitions/:id/publish')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.HR_EMPLOYEE, Role.SYSTEM_ADMIN)
  async updateJobPublishStatus(@Param('id') id: string, @Body() publishDto: PublishJobDto) {
    return this.recruitmentService.publishJob(id, publishDto);
  }

  // ========== PHASE 1: CANDIDATE APPLICATION ==========

  /**
   * REC-007: Candidate applies for position (Public endpoint)
   * REC-028: Implicit consent for data processing
   */
  @Post('applications')
  @Public()
  @UseInterceptors(
    FileInterceptor('cv', {
      storage: diskStorage({
        destination: './uploads/cvs',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `cv-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowedExtensions = /pdf|doc|docx/;
        const ext = extname(file.originalname).toLowerCase().substring(1);
        if (allowedExtensions.test(ext)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only PDF, DOC, and DOCX files are allowed'), false);
        }
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
      },
    }),
  )
  async createApplication(
    @Body() createDto: CreateApplicationDto,
    @UploadedFile() cvFile: Express.Multer.File,
  ) {
    if (!cvFile) {
      throw new BadRequestException('CV file is required');
    }
    return this.recruitmentService.createApplication(createDto, cvFile);
  }

  /**
   * REC-008: Update application stage
   * Accessible by: HR Employee, HR Manager
   */
  @Put('applications/:id/stage')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.HR_EMPLOYEE, Role.SYSTEM_ADMIN)
  async updateApplicationStage(
    @Param('id') id: string,
    @Body() updateDto: UpdateApplicationStageDto,
  ) {
    return this.recruitmentService.updateApplicationStage(id, updateDto);
  }

  /**
   * Get applications with filters
   * Accessible by: HR roles, Managers
   */
  @Get('applications')
  @Roles(
    Role.DEPARTMENT_HEAD,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async getApplications(
    @Query('requisitionId') requisitionId?: string,
    @Query('candidateId') candidateId?: string,
    @Query('status') status?: ApplicationStatus,
    @Query('currentStage') currentStage?: ApplicationStage,
  ) {
    return this.recruitmentService.getApplications({
      requisitionId,
      candidateId,
      status,
      currentStage,
    });
  }

  /**
   * Get application by ID
   * Accessible by: HR roles, Managers
   */
  @Get('applications/:id')
  @Roles(
    Role.DEPARTMENT_HEAD,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async getApplicationById(@Param('id') id: string) {
    return this.recruitmentService.getApplicationById(id);
  }

  // ========== PHASE 1: CANDIDATE COMMUNICATION ==========

  /**
   * REC-017: Notify candidate of application status updates
   * Accessible by: HR roles
   */
  @Put('applications/:id/notify-status')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.HR_EMPLOYEE, Role.SYSTEM_ADMIN)
  async notifyCandidateStatus(
    @Param('id') id: string,
    @Body() dto: NotifyCandidateStatusDto,
  ) {
    return this.recruitmentService.notifyCandidateStatus(id, dto.message);
  }

  /**
   * REC-022: Send automated rejection notification
   * Accessible by: HR roles
   */
  @Put('applications/:id/reject')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.HR_EMPLOYEE, Role.SYSTEM_ADMIN)
  async rejectApplication(
    @Param('id') id: string,
    @Body() dto: RejectApplicationDto,
  ) {
    return this.recruitmentService.rejectApplication(id, dto.reason);
  }

  /**
   * REC-030: Tag candidate as referral
   * Accessible by: HR Employee, HR Manager
   */
  @Put('applications/:id/referral')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.HR_EMPLOYEE, Role.SYSTEM_ADMIN)
  async tagReferral(
    @Param('id') id: string,
    @Body() dto: TagReferralDto,
  ) {
    return this.recruitmentService.tagReferral(id, dto.referral);
  }

  /**
   * REC-009: Get recruitment progress dashboard
   * Accessible by: HR Manager, HR Admin
   */
  @Get('dashboard/progress')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async getRecruitmentProgressDashboard() {
    return this.recruitmentService.getRecruitmentProgressDashboard();
  }

  // ========== PHASE 1: INTERVIEW & EVALUATION ==========

  /**
   * REC-010, REC-021: Schedule interview
   * Accessible by: HR Employee, HR Manager
   */
  @Post('interviews')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.HR_EMPLOYEE, Role.SYSTEM_ADMIN)
  async scheduleInterview(@Body() scheduleDto: ScheduleInterviewDto) {
    return this.recruitmentService.scheduleInterview(scheduleDto);
  }

  /**
   * Get interviews for application
   * Accessible by: HR roles, Interview Panel Members
   */
  @Get('applications/:applicationId/interviews')
  @Roles(
    Role.DEPARTMENT_HEAD,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async getInterviewsByApplication(@Param('applicationId') applicationId: string) {
    return this.recruitmentService.getInterviewsByApplication(applicationId);
  }

  /**
   * Update interview status
   * Accessible by: HR Employee, HR Manager
   */
  @Put('interviews/:id/status')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.HR_EMPLOYEE, Role.SYSTEM_ADMIN)
  async updateInterviewStatus(
    @Param('id') id: string,
    @Body() dto: UpdateInterviewStatusDto,
  ) {
    return this.recruitmentService.updateInterviewStatus(id, dto.status);
  }

  /**
   * REC-011, REC-020: Submit interview feedback and score
   * Accessible by: Interview Panel Members, HR roles, Managers
   */
  @Post('interviews/feedback')
  @Roles(
    Role.DEPARTMENT_HEAD,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async submitInterviewFeedback(@Body() feedbackDto: SubmitInterviewFeedbackDto) {
    return this.recruitmentService.submitInterviewFeedback(feedbackDto);
  }

  /**
   * Get assessment results for interview
   * Accessible by: HR roles, Managers
   */
  @Get('interviews/:interviewId/assessments')
  @Roles(
    Role.DEPARTMENT_HEAD,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async getAssessmentsByInterview(@Param('interviewId') interviewId: string) {
    return this.recruitmentService.getAssessmentsByInterview(interviewId);
  }

  /**
   * Calculate average score for application
   * Accessible by: HR roles, Managers
   */
  @Get('applications/:applicationId/score')
  @Roles(
    Role.DEPARTMENT_HEAD,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async calculateApplicationScore(@Param('applicationId') applicationId: string) {
    const score = await this.recruitmentService.calculateApplicationScore(applicationId);
    return { applicationId, averageScore: score };
  }

  // ========== PHASE 1: OFFER MANAGEMENT (Creation & Approval) ==========

  /**
   * REC-014, REC-018: Create job offer
   * Accessible by: HR Manager, HR Employee
   */
  @Post('offers')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.HR_EMPLOYEE, Role.SYSTEM_ADMIN)
  async createOffer(@Request() req, @Body() createDto: CreateOfferDto) {
    return this.recruitmentService.createOffer(createDto, req.user.employeeId);
  }

  /**
   * Get offers with filters
   * Accessible by: HR roles, Managers
   */
  @Get('offers')
  @Roles(
    Role.DEPARTMENT_HEAD,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async getOffers(
    @Query('applicationId') applicationId?: string,
    @Query('candidateId') candidateId?: string,
    @Query('finalStatus') finalStatus?: OfferFinalStatus,
  ) {
    return this.recruitmentService.getOffers({ applicationId, candidateId, finalStatus });
  }

  /**
   * Get offer by ID
   * Accessible by: HR roles, Managers
   */
  @Get('offers/:id')
  @Roles(
    Role.DEPARTMENT_HEAD,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.HR_EMPLOYEE,
    Role.SYSTEM_ADMIN,
  )
  async getOfferById(@Param('id') id: string) {
    return this.recruitmentService.getOfferById(id);
  }

  /**
   * Process offer approval (HR Manager, Financial approval)
   * Accessible by: HR Manager, Managers
   */
  @Post('offers/:id/approve')
  @Roles(Role.DEPARTMENT_HEAD, Role.HR_MANAGER, Role.SYSTEM_ADMIN)
  async processOfferApproval(
    @Request() req,
    @Param('id') id: string,
    @Body() approvalDto: ProcessOfferApprovalDto,
    @Query('role') approverRole?: string,
  ) {
    return this.recruitmentService.processOfferApproval(
      id,
      req.user.employeeId,
      approverRole || 'HR_Manager',
      approvalDto,
    );
  }

  /**
   * Candidate responds to offer (Public endpoint for candidate portal)
   */
  @Put('offers/:id/respond')
  @Public()
  async respondToOffer(@Param('id') id: string, @Body() responseDto: RespondToOfferDto) {
    return this.recruitmentService.respondToOffer(id, responseDto);
  }

  // ========== PHASE 1: OFFER MANAGEMENT (Pre-boarding) ==========

  /**
   * REC-029: Trigger pre-boarding tasks after offer acceptance
   * Accessible by: HR Employee, HR Manager
   */
  @Post('offers/:id/preboarding')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.HR_EMPLOYEE, Role.SYSTEM_ADMIN)
  async triggerPreboardingTasks(@Param('id') id: string) {
    return this.recruitmentService.triggerPreboardingTasks(id);
  }

  // ========== PHASE 2: ONBOARDING - CONTRACT CREATION ==========

  /**
   * ONB-002: Create contract from accepted offer
   * Accessible by: HR Manager, HR Employee
   */
  @Post('contracts')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.HR_EMPLOYEE, Role.SYSTEM_ADMIN)
  async createContract(@Body() createDto: CreateContractDto) {
    return this.recruitmentService.createContract(createDto);
  }

  /**
   * Get contracts
   * Accessible by: HR roles
   */
  @Get('contracts')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.HR_EMPLOYEE, Role.SYSTEM_ADMIN)
  async getContracts(@Query('offerId') offerId?: string) {
    return this.recruitmentService.getContracts({ offerId });
  }

  /**
   * Get contract by ID
   * Accessible by: HR roles
   */
  @Get('contracts/:id')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.HR_EMPLOYEE, Role.SYSTEM_ADMIN)
  async getContractById(@Param('id') id: string) {
    return this.recruitmentService.getContractById(id);
  }

  // ========== PHASE 2: ONBOARDING - TASK CHECKLIST ==========

  /**
   * ONB-001: Create onboarding task checklist
   * Accessible by: HR Manager, HR Employee
   */
  @Post('onboarding/checklists')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.HR_EMPLOYEE, Role.SYSTEM_ADMIN)
  async createOnboardingChecklist(@Body() dto: CreateOnboardingChecklistDto) {
    return this.recruitmentService.createOnboardingChecklist(dto.contractId);
  }

  // ========== PHASE 3: OFFBOARDING - TERMINATION & RESIGNATION ==========

  /**
   * OFF-001, OFF-018: Create termination/resignation request
   * Accessible by: Employees (resignation), HR Manager (termination)
   */
  @Post('terminations')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.SYSTEM_ADMIN,
  )
  async createTerminationRequest(@Body() createDto: CreateTerminationRequestDto) {
    return this.recruitmentService.createTerminationRequest(createDto);
  }

  /**
   * OFF-019: Get termination requests (track resignation status)
   * Accessible by: Employees (own requests), HR roles (all), Managers (team)
   */
  @Get('terminations')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.SYSTEM_ADMIN,
  )
  async getTerminationRequests(
    @Request() req,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: TerminationStatus,
  ) {
    // If employee is querying, default to their own requests unless they're HR/Manager
    const targetEmployeeId = employeeId || req.user.employeeId;
    return this.recruitmentService.getTerminationRequests({ employeeId: targetEmployeeId, status });
  }

  /**
   * Get termination request by ID
   * Accessible by: Employees (own), HR roles, Managers
   */
  @Get('terminations/:id')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.SYSTEM_ADMIN,
  )
  async getTerminationRequestById(@Param('id') id: string) {
    return this.recruitmentService.getTerminationRequestById(id);
  }

  /**
   * Process termination request (approve/reject)
   * Accessible by: HR Manager, System Admin
   */
  @Put('terminations/:id/process')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async processTerminationRequest(
    @Param('id') id: string,
    @Body() processDto: ProcessTerminationDto,
  ) {
    return this.recruitmentService.processTerminationRequest(id, processDto);
  }

  // ========== PHASE 3: OFFBOARDING - FINAL SETTLEMENT ==========

  /**
   * OFF-013: Trigger final settlement (benefits termination, final pay calculation)
   * Accessible by: HR Manager, HR Admin
   */
  @Put('terminations/:id/settlement')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async processFinalSettlement(
    @Param('id') id: string,
    @Body() dto: ProcessFinalSettlementDto,
  ) {
    return this.recruitmentService.processFinalSettlement(id, dto.includeUnusedLeave);
  }

  // ========== PHASE 3: OFFBOARDING - CLEARANCE & ASSET RECOVERY ==========

  /**
   * OFF-006: Create clearance checklist (automatically created on termination approval)
   * Accessible by: HR Manager, HR Admin
   */
  @Post('clearance/:terminationId')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async createClearanceChecklist(@Param('terminationId') terminationId: string) {
    return this.recruitmentService.createClearanceChecklist(terminationId);
  }

  /**
   * Get clearance checklist by termination ID
   * Accessible by: HR roles, Department heads (for their dept sign-off)
   */
  @Get('clearance/termination/:terminationId')
  @Roles(
    Role.DEPARTMENT_HEAD,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.SYSTEM_ADMIN,
  )
  async getClearanceChecklistByTermination(@Param('terminationId') terminationId: string) {
    return this.recruitmentService.getClearanceChecklistByTermination(terminationId);
  }

  /**
   * OFF-010: Update clearance item (department sign-off)
   * Accessible by: Department heads, HR roles
   */
  @Put('clearance/:checklistId/items')
  @Roles(
    Role.DEPARTMENT_HEAD,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.SYSTEM_ADMIN,
  )
  async updateClearanceItem(
    @Request() req,
    @Param('checklistId') checklistId: string,
    @Body() updateDto: UpdateClearanceItemDto,
  ) {
    return this.recruitmentService.updateClearanceItem(
      checklistId,
      req.user.employeeId,
      updateDto,
    );
  }

  /**
   * Update equipment return status
   * Accessible by: HR roles, Facilities/IT
   */
  @Put('clearance/:checklistId/equipment')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async updateEquipmentReturn(
    @Param('checklistId') checklistId: string,
    @Body() updateDto: UpdateEquipmentReturnDto,
  ) {
    return this.recruitmentService.updateEquipmentReturn(checklistId, updateDto);
  }

  /**
   * Update card return status
   * Accessible by: HR roles, Facilities
   */
  @Put('clearance/:checklistId/card')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async updateCardReturn(
    @Param('checklistId') checklistId: string,
    @Body() dto: UpdateCardReturnDto,
  ) {
    return this.recruitmentService.updateCardReturn(checklistId, dto.returned);
  }

  /**
   * Check if clearance is complete
   * Accessible by: HR roles
   */
  @Get('clearance/:checklistId/complete')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN)
  async isClearanceComplete(@Param('checklistId') checklistId: string) {
    const isComplete = await this.recruitmentService.isClearanceComplete(checklistId);
    return { checklistId, isComplete };
  }
}